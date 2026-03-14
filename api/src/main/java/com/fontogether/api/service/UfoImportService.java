package com.fontogether.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fontogether.api.model.domain.Glyph;
import com.fontogether.api.model.domain.Project;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class UfoImportService {

    private final ObjectMapper objectMapper;

    record UfoData(Project project, List<Glyph> glyphs) {}

    public UfoData parseUfoZip(MultipartFile file, Long ownerId, String customTitle) throws Exception {
        Map<String, byte[]> fileContentMap = new HashMap<>();

        // 1. Read ZIP content into memory map
        try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                String name = entry.getName();
                
                // Read entry content
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[1024];
                int len;
                while ((len = zis.read(buffer)) > 0) {
                    baos.write(buffer, 0, len);
                }
                fileContentMap.put(name, baos.toByteArray());
            }
        }
        
        return parseUfoData(fileContentMap, ownerId, customTitle);
    }
    
    public UfoData parseUfoDirectory(java.io.File directory, Long ownerId, String customTitle) throws Exception {
        Map<String, byte[]> fileContentMap = new HashMap<>();
        // Recursively read directory
        readDirectoryRecursively(directory, directory, fileContentMap);
        log.info("Loaded {} files from directory. Keys: {}", fileContentMap.size(), fileContentMap.keySet());
        return parseUfoData(fileContentMap, ownerId, customTitle);
    }

    private void readDirectoryRecursively(java.io.File root, java.io.File current, Map<String, byte[]> map) throws java.io.IOException {
        java.io.File[] files = current.listFiles();
        if (files == null) return;
        
        for (java.io.File f : files) {
            if (f.isDirectory()) {
                readDirectoryRecursively(root, f, map);
            } else {
                // Rel path
                // toURI().relativize() produces URI paths (forward slashes) on most platforms
                String relativePath = root.toURI().relativize(f.toURI()).getPath();
                
                // Explicitly normalize to forward slash regardless of platform just in case
                if (java.io.File.separatorChar == '\\') {
                    relativePath = relativePath.replace('\\', '/');
                }
                
                map.put(relativePath, java.nio.file.Files.readAllBytes(f.toPath()));
            }
        }
    }

    private UfoData parseUfoData(Map<String, byte[]> fileContentMap, Long ownerId, String customTitle) throws Exception {
        boolean hasCustomTitle = (customTitle != null && !customTitle.isEmpty());
        String initialTitle = hasCustomTitle ? customTitle : "Imported Project";

        Project project = Project.builder()
                .ownerId(ownerId)
                // Default Title or Custom Title
                .title(initialTitle) 
                .build();
        
        List<Glyph> glyphs = new ArrayList<>();

        // 2. Parse Metadata Files
        // Find root folder prefix if any (e.g., "MyFont.ufo/metainfo.plist")
        String rootPrefix = findRootPrefix(fileContentMap.keySet());
        
        // metainfo.plist
        String metaInfoJson = parsePlistToJson(fileContentMap.get(rootPrefix + "metainfo.plist"));
        try {
            ObjectNode metaInfo = (ObjectNode) objectMapper.readTree(metaInfoJson);
            if (metaInfo.has("formatVersion")) {
                int formatVersion = metaInfo.get("formatVersion").asInt();
                if (formatVersion != 3) {
                     throw new IllegalArgumentException("Unsupported UFO format version: " + formatVersion + ". Only version 3 is supported.");
                }
            } else {
                 throw new IllegalArgumentException("Invalid UFO: metainfo.plist missing formatVersion");
            }
        } catch (IllegalArgumentException e) {
            throw e; // Rethrow expected errors
        } catch (Exception e) {
            log.warn("Failed to check formatVersion", e);
            // Optionally enforce strict check instead of warn
             throw new IllegalArgumentException("Invalid metainfo.plist: " + e.getMessage());
        }
        
        project.setMetaInfo(metaInfoJson);
        
        // fontinfo.plist
        String fontInfoJson = parsePlistToJson(fileContentMap.get(rootPrefix + "fontinfo.plist"));
        project.setFontInfo(fontInfoJson);
        
        // Only update title from fontinfo if custom title was NOT provided
        if (!hasCustomTitle) {
            updateProjectTitleFromFontInfo(project, fontInfoJson);
        }
        
        // groups.plist
        project.setGroups(parsePlistToJson(fileContentMap.get(rootPrefix + "groups.plist")));
        
        // kerning.plist
        project.setKerning(parsePlistToJson(fileContentMap.get(rootPrefix + "kerning.plist")));
        
        // layercontents.plist -> layer_config
        project.setLayerConfig(parseLayerContents(fileContentMap.get(rootPrefix + "layercontents.plist")));
        
        // lib.plist
        project.setLib(parsePlistToJson(fileContentMap.get(rootPrefix + "lib.plist")));
        
        // features.fea
        byte[] featuresBytes = fileContentMap.get(rootPrefix + "features.fea");
        if (featuresBytes != null) {
            String rawFeatures = new String(featuresBytes, StandardCharsets.UTF_8);
            project.setFeatures(parseFeaturesToJson(rawFeatures));
        } else {
            project.setFeatures("{\"prefix\": \"\", \"classes\": [], \"features\": []}");
        }

        // 3. Parse Glyphs
        // Extract unitsPerEm for fallback
        int unitsPerEm = 1000; // Default
        try {
            if (project.getFontInfo() != null) {
                ObjectNode fontInfo = (ObjectNode) objectMapper.readTree(project.getFontInfo());
                if (fontInfo.has("unitsPerEm")) {
                    unitsPerEm = fontInfo.get("unitsPerEm").asInt();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse unitsPerEm from fontinfo", e);
        }

        // Try to read contents.plist to determind glyph order and mapping
        String contentsPlistPath = rootPrefix + "glyphs/contents.plist";
        byte[] contentsPlistBytes = fileContentMap.get(contentsPlistPath);

        if (contentsPlistBytes != null) {
            // Drive from contents.plist (Correct Order)
            String contentsJson = parsePlistToJson(contentsPlistBytes);
            try {
                 ObjectNode contents = (ObjectNode) objectMapper.readTree(contentsJson);
                 int sortCounter = 0;
                 
                 // Iterator returns fields in insertion order (which mirrors XML order)
                 Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = contents.fields();
                 while (fields.hasNext()) {
                     Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> field = fields.next();
                     // String glyphName = field.getKey(); // Unused
                     String fileName = field.getValue().asText();
                     
                     String glifPath = rootPrefix + "glyphs/" + fileName;
                     byte[] glifBytes = fileContentMap.get(glifPath);
                     
                     if (glifBytes != null) {
                         Glyph glyph = parseGlif(glifBytes, unitsPerEm);
                         if (glyph != null) {
                             // Force name from contents.plist if mismatch? Usually they match.
                             // But let's trust the glif content or overrides? 
                             // Valid UFO: glif also has name.
                             
                             glyph.setLayerName("public.default");
                             glyph.setSortOrder(sortCounter++); 
                             glyphs.add(glyph);
                         }
                     }
                 }
            } catch (Exception e) {
                log.error("Failed to parse contents.plist JSON", e);
                // Fallback to file scanning if valid parsing fails?
                scanAllGlifFiles(fileContentMap, rootPrefix, unitsPerEm, glyphs);
            }
        } else {
            // Fallback: Scan all .glif files (Random Order)
            scanAllGlifFiles(fileContentMap, rootPrefix, unitsPerEm, glyphs);
        }

        return new UfoData(project, glyphs);
    }

    private void scanAllGlifFiles(Map<String, byte[]> fileContentMap, String rootPrefix, int unitsPerEm, List<Glyph> glyphs) {
         for (String path : fileContentMap.keySet()) {
            if (path.startsWith(rootPrefix + "glyphs/") && path.endsWith(".glif")) {
                Glyph glyph = parseGlif(fileContentMap.get(path), unitsPerEm);
                if (glyph != null) {
                    glyph.setLayerName("public.default"); // Default layer
                    // No sortOrder defined
                    glyphs.add(glyph);
                }
            }
        }
    }

    private String findRootPrefix(Set<String> paths) {
        // Prefer shortest path that is not separate metadata (MACOSX)
        String candidate = null;
        for (String path : paths) {
            // Ignore __MACOSX folder and dot-underscore files (._metainfo.plist)
            if (path.contains("__MACOSX") || path.contains("/._") || path.startsWith("._")) {
                continue;
            }
            
            if (path.endsWith("metainfo.plist")) {
                // Determine prefix
                String prefix = path.substring(0, path.length() - "metainfo.plist".length());
                // If prefix is empty string, it means metainfo.plist is at root.
                
                // If we found multiple, maybe pick the shortest (top-most)? 
                // Usually there is only one valid ufo.
                if (candidate == null || prefix.length() < candidate.length()) {
                    candidate = prefix;
                }
            }
        }
        return candidate != null ? candidate : "";
    }

    private String parsePlistToJson(byte[] bytes) {
        if (bytes == null) return "{}";
        try {
            // Restore standard XML parsing with security configuration.
            // Since the user might have been running old code, the previous "failure" 
            // of this method might have been false positive. 
            // We use the EntityResolver + Feature approach which is standard and secure.
            
            DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
            // Secure features: Allow DOCTYPE but forbid external entities
            dbFactory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false); 
            dbFactory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            dbFactory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            dbFactory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            
            dbFactory.setXIncludeAware(false);
            dbFactory.setExpandEntityReferences(false);

            DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
            
            // Critical: Ignore DTD external URLs completely by returning empty source
            dBuilder.setEntityResolver(new org.xml.sax.EntityResolver() {
                @Override
                public org.xml.sax.InputSource resolveEntity(String publicId, String systemId) {
                    return new org.xml.sax.InputSource(new java.io.StringReader(""));
                }
            });

            Document doc = dBuilder.parse(new ByteArrayInputStream(bytes));
            
            NodeList dicts = doc.getElementsByTagName("dict");
            if (dicts.getLength() == 0) {
                 log.warn("No <dict> found in plist");
                 return "{}";
            }
            Element dict = (Element) dicts.item(0);
            return convertDictToJson(dict).toString();
        } catch (Exception e) {
            log.error("Failed to parse plist.", e);
            return "{}";
        }
    }
    
    private ObjectNode convertDictToJson(Element dict) {
        ObjectNode node = objectMapper.createObjectNode();
        if (dict == null) return node;

        NodeList children = dict.getChildNodes();
        String currentKey = null;

        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() != Node.ELEMENT_NODE) continue;
            
            String tagName = child.getNodeName();
            if ("key".equals(tagName)) {
                currentKey = child.getTextContent();
            } else if (currentKey != null) {
                // Value node
                switch (tagName) {
                    case "string" -> node.put(currentKey, child.getTextContent());
                    case "integer" -> node.put(currentKey, Integer.parseInt(child.getTextContent()));
                    case "real" -> node.put(currentKey, Double.parseDouble(child.getTextContent()));
                    case "true" -> node.put(currentKey, true);
                    case "false" -> node.put(currentKey, false);
                    case "data" -> node.put(currentKey, "DATA:" + child.getTextContent().trim()); // Prefix to identify on export
                    case "array" -> node.set(currentKey, convertArrayToJson((Element) child));
                    case "dict" -> node.set(currentKey, convertDictToJson((Element) child));
                }
                currentKey = null;
            }
        }
        return node;
    }
    
    private ArrayNode convertArrayToJson(Element array) {
        ArrayNode node = objectMapper.createArrayNode();
        NodeList children = array.getChildNodes();
         for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() != Node.ELEMENT_NODE) continue;
             String tagName = child.getNodeName();
             switch (tagName) {
                case "string" -> node.add(child.getTextContent());
                case "integer" -> node.add(Integer.parseInt(child.getTextContent()));
                case "real" -> node.add(Double.parseDouble(child.getTextContent()));
                 case "true" -> node.add(true);
                 case "false" -> node.add(false);
                case "array" -> node.add(convertArrayToJson((Element) child));
                case "dict" -> node.add(convertDictToJson((Element) child));
            }
        }
        return node;
    }

    private String parseLayerContents(byte[] bytes) {
        // layercontents.plist is an array of [layerName, dirName]
        // return JSON: {"layers": [{"name": "public.default", "color": "#000000"}]}
        // For MVP, just return a default structure or parse if possible.
        // It's usually small.
        if (bytes == null) return "{\"layers\": [{\"name\": \"public.default\", \"color\": \"#000000\"}]}";
        return parsePlistToJson(bytes); // Reuse generic parser, result will be JSON Array or Object
    }

    private void updateProjectTitleFromFontInfo(Project project, String fontInfoJson) {
        try {
            ObjectNode root = (ObjectNode) objectMapper.readTree(fontInfoJson);
            String familyName = root.has("familyName") ? root.get("familyName").asText() : "";
            String styleName = root.has("styleName") ? root.get("styleName").asText() : "";
            if (!familyName.isEmpty()) {
                project.setTitle(familyName + " " + styleName);
            }
        } catch (Exception e) {
            // ignore
        }
    }

    private Glyph parseGlif(byte[] bytes, int defaultMetric) {
        try {
             DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
             DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
             Document doc = dBuilder.parse(new ByteArrayInputStream(bytes));
             
             Element glyphElem = doc.getDocumentElement();
             String name = glyphElem.getAttribute("name");
             String format = glyphElem.getAttribute("format");
             
             Glyph glyph = Glyph.builder()
                     .glyphName(name)
                     .formatVersion(format.isEmpty() ? 1 : Integer.parseInt(format))
                     .build();

             // Unicodes
             List<String> unicodes = new ArrayList<>();
             NodeList unicodeNodes = glyphElem.getElementsByTagName("unicode");
             for(int i=0; i<unicodeNodes.getLength(); i++) {
                 Element u = (Element) unicodeNodes.item(i);
                 unicodes.add(u.getAttribute("hex"));
             }
             glyph.setUnicodes(unicodes);
             
             // Advance
             NodeList advanceNodes = glyphElem.getElementsByTagName("advance");
             if (advanceNodes.getLength() > 0) {
                 Element adv = (Element) advanceNodes.item(0);
                 
                 // Apply defaultMetric (unitsPerEm) if attribute is missing
                 if (adv.hasAttribute("width")) {
                     glyph.setAdvanceWidth(Integer.parseInt(adv.getAttribute("width")));
                 } else {
                     glyph.setAdvanceWidth(defaultMetric);
                 }
                 
                 if (adv.hasAttribute("height")) {
                     glyph.setAdvanceHeight(Integer.parseInt(adv.getAttribute("height")));
                 } else {
                     glyph.setAdvanceHeight(defaultMetric);
                 }
                 
             } else {
                 // No advance tag at all
                 glyph.setAdvanceWidth(defaultMetric);
                 glyph.setAdvanceHeight(defaultMetric);
             }
             
             // Outline Data -> Convert XML outline to JSON structure for frontend
             Element outline = (Element) glyphElem.getElementsByTagName("outline").item(0);
             if (outline != null) {
                 glyph.setOutlineData(convertOutlineToJson(outline));
             } else {
                 glyph.setOutlineData("{}");
             }
             
             glyph.setProperties("{}"); // Simplification for now
             
             return glyph;

        } catch (Exception e) {
            log.error("Failed to parse glif", e);
            return null;
        }
    }

    private String convertOutlineToJson(Element outline) {
        // Convert <contour>, <component> to JSON
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode contours = objectMapper.createArrayNode();
        ArrayNode components = objectMapper.createArrayNode();

        NodeList children = outline.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() != Node.ELEMENT_NODE) continue;
            
            if ("contour".equals(child.getNodeName())) {
                ArrayNode points = objectMapper.createArrayNode();
                NodeList pointNodes = child.getChildNodes();
                 for (int j = 0; j < pointNodes.getLength(); j++) {
                     Node pNode = pointNodes.item(j);
                     if (pNode.getNodeType() == Node.ELEMENT_NODE && "point".equals(pNode.getNodeName())) {
                         Element p = (Element) pNode;
                         ObjectNode pointObj = objectMapper.createObjectNode();
                         pointObj.put("x", Double.parseDouble(p.getAttribute("x")));
                         pointObj.put("y", Double.parseDouble(p.getAttribute("y")));
                         if(p.hasAttribute("type")) pointObj.put("type", p.getAttribute("type"));
                         if(p.hasAttribute("smooth")) pointObj.put("smooth", "yes".equals(p.getAttribute("smooth")));
                         points.add(pointObj);
                     }
                 }
                 ObjectNode contourObj = objectMapper.createObjectNode();
                 contourObj.set("points", points);
                 contours.add(contourObj);
            } else if ("component".equals(child.getNodeName())) {
                Element cmp = (Element) child;
                ObjectNode compObj = objectMapper.createObjectNode();
                compObj.put("base", cmp.getAttribute("base"));
                if(cmp.hasAttribute("xScale")) compObj.put("xScale", Double.parseDouble(cmp.getAttribute("xScale")));
                if(cmp.hasAttribute("xyScale")) compObj.put("xyScale", Double.parseDouble(cmp.getAttribute("xyScale")));
                if(cmp.hasAttribute("yxScale")) compObj.put("yxScale", Double.parseDouble(cmp.getAttribute("yxScale")));
                if(cmp.hasAttribute("yScale")) compObj.put("yScale", Double.parseDouble(cmp.getAttribute("yScale")));
                if(cmp.hasAttribute("xOffset")) compObj.put("xOffset", Double.parseDouble(cmp.getAttribute("xOffset")));
                if(cmp.hasAttribute("yOffset")) compObj.put("yOffset", Double.parseDouble(cmp.getAttribute("yOffset")));
                components.add(compObj);
            }
        }
        
        root.set("contours", contours);
        root.set("components", components);
        return root.toString();
    }

    private String parseFeaturesToJson(String content) {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode languagesystems = objectMapper.createArrayNode();
        ArrayNode classesArray = objectMapper.createArrayNode();
        ArrayNode lookupsArray = objectMapper.createArrayNode();
        ArrayNode tablesArray = objectMapper.createArrayNode();
        ArrayNode featuresArray = objectMapper.createArrayNode();
        
        // Check for empty content
        if (content == null || content.trim().isEmpty()) {
            root.set("languagesystems", languagesystems);
            root.set("classes", classesArray);
            root.set("lookups", lookupsArray);
            root.set("tables", tablesArray);
            root.set("features", featuresArray);
            root.put("prefix", "");
            return root.toString();
        }

        String remaining = content;

        // 1. Extract TABLE blocks: table Tag { ... } Tag;
        java.util.regex.Pattern tablePattern = java.util.regex.Pattern.compile("table\\s+(\\w+)\\s*\\{(.*?)\\}\\s*\\1\\s*;", java.util.regex.Pattern.DOTALL);
        java.util.regex.Matcher tableMatcher = tablePattern.matcher(remaining);
        while (tableMatcher.find()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("tag", tableMatcher.group(1));
            node.put("code", tableMatcher.group(2).trim());
            tablesArray.add(node);
        }
        remaining = tableMatcher.replaceAll("");

        // 2. Extract FEATURE blocks: feature Tag { ... } Tag;
        java.util.regex.Pattern featurePattern = java.util.regex.Pattern.compile("feature\\s+(\\w+)\\s*\\{(.*?)\\}\\s*\\1\\s*;", java.util.regex.Pattern.DOTALL);
        java.util.regex.Matcher featureMatcher = featurePattern.matcher(remaining);
        while (featureMatcher.find()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("tag", featureMatcher.group(1));
            node.put("code", featureMatcher.group(2).trim());
            featuresArray.add(node);
        }
        remaining = featureMatcher.replaceAll("");

        // 3. Extract LOOKUP blocks: lookup Name { ... } Name;
        java.util.regex.Pattern lookupPattern = java.util.regex.Pattern.compile("lookup\\s+(\\w+)\\s*\\{(.*?)\\}\\s*\\1\\s*;", java.util.regex.Pattern.DOTALL);
        java.util.regex.Matcher lookupMatcher = lookupPattern.matcher(remaining);
        while (lookupMatcher.find()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("name", lookupMatcher.group(1));
            node.put("code", lookupMatcher.group(2).trim());
            lookupsArray.add(node);
        }
        remaining = lookupMatcher.replaceAll("");

        // 4. Extract CLASSES: @Name = [ ... ];
        java.util.regex.Pattern classPattern = java.util.regex.Pattern.compile("(@\\w+)\\s*=\s*\\[(.*?)\\]\\s*;", java.util.regex.Pattern.DOTALL);
        java.util.regex.Matcher classMatcher = classPattern.matcher(remaining);
        while (classMatcher.find()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("name", classMatcher.group(1));
            node.put("code", classMatcher.group(2).trim());
            classesArray.add(node);
        }
        remaining = classMatcher.replaceAll("");

        // 5. Extract LANGUAGESYSTEMs: languagesystem Script Lang;
        java.util.regex.Pattern langPattern = java.util.regex.Pattern.compile("languagesystem\\s+(\\w+)\\s+(\\w+)\\s*;", java.util.regex.Pattern.MULTILINE);
        java.util.regex.Matcher langMatcher = langPattern.matcher(remaining);
        while (langMatcher.find()) {
            languagesystems.add(langMatcher.group(0).trim());
        }
        remaining = langMatcher.replaceAll("");

        // 6. Remaining is PREFIX
        String prefixText = remaining.trim();
        
        root.set("languagesystems", languagesystems);
        root.set("classes", classesArray);
        root.set("lookups", lookupsArray);
        root.set("tables", tablesArray);
        root.set("features", featuresArray);
        root.put("prefix", prefixText);

        return root.toString();
    }
}
