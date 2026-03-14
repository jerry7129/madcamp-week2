package com.fontogether.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fontogether.api.model.domain.Glyph;
import com.fontogether.api.model.domain.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class UfoExportService {

    private final ObjectMapper objectMapper;

    public byte[] exportProjectToUfo(Project project, List<Glyph> glyphs) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            String rootDir = project.getTitle().replaceAll("[^a-zA-Z0-9._-]", "_") + ".ufo/";

            // 1. metainfo.plist
            zos.putNextEntry(new ZipEntry(rootDir + "metainfo.plist"));
            zos.write(createMetaInfo().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 2. fontinfo.plist
            zos.putNextEntry(new ZipEntry(rootDir + "fontinfo.plist"));
            zos.write(jsonToPlist(project.getFontInfo()).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 3. groups.plist
            zos.putNextEntry(new ZipEntry(rootDir + "groups.plist"));
            zos.write(jsonToPlist(project.getGroups()).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 4. kerning.plist
            zos.putNextEntry(new ZipEntry(rootDir + "kerning.plist"));
            zos.write(jsonToPlist(project.getKerning()).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
            
            // 5. lib.plist
            zos.putNextEntry(new ZipEntry(rootDir + "lib.plist"));
            zos.write(jsonToPlist(project.getLib()).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 6. layercontents.plist (Static for now: public.default -> glyphs)
            zos.putNextEntry(new ZipEntry(rootDir + "layercontents.plist"));
            zos.write(createLayerContents().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 7. features.fea
            zos.putNextEntry(new ZipEntry(rootDir + "features.fea"));
            zos.write(jsonToFea(project.getFeatures()).getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 8. Glyphs
            // 8. Glyphs & contents.plist
            StringBuilder contentsPlistBuilder = new StringBuilder();
            contentsPlistBuilder.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            contentsPlistBuilder.append("<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n");
            contentsPlistBuilder.append("<plist version=\"1.0\">\n");
            contentsPlistBuilder.append("<dict>\n");

            java.util.Set<String> existingFileNames = new java.util.HashSet<>();

            for (Glyph glyph : glyphs) {
                // UFO 3 Convention: Glyph Name -> File Name
                String fileName = glyphNameToFileName(glyph.getGlyphName(), existingFileNames) + ".glif";
                existingFileNames.add(fileName.toLowerCase()); // Track lower case for collision check

                // Add to contents.plist order
                contentsPlistBuilder.append("  <key>").append(glyph.getGlyphName()).append("</key>\n");
                contentsPlistBuilder.append("  <string>").append(fileName).append("</string>\n");
                
                zos.putNextEntry(new ZipEntry(rootDir + "glyphs/" + fileName));
                zos.write(glyphToGlif(glyph).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
            
            contentsPlistBuilder.append("</dict>\n");
            contentsPlistBuilder.append("</plist>");
            
            // Write contents.plist
            zos.putNextEntry(new ZipEntry(rootDir + "glyphs/contents.plist"));
            zos.write(contentsPlistBuilder.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            zos.finish();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to export UFO zip", e);
        }
    }
    
    // UFO 3 Convention Implementation
    private String glyphNameToFileName(String glyphName, java.util.Set<String> existingOriginals) {
        // 1. Replace illegal characters
        // " * + / : < > ? [ \ ] | \0 and delete (U+007F) and controls (0-31)
        StringBuilder sb = new StringBuilder();
        for (char c : glyphName.toCharArray()) {
            if (c == '"' || c == '*' || c == '+' || c == '/' || c == ':' || c == '<' || c == '>' || 
                c == '?' || c == '[' || c == '\\' || c == ']' || c == '|' || c < 32 || c == 127) {
                sb.append('_');
            } else if (Character.isUpperCase(c)) {
                sb.append(c).append('_');
            } else {
                sb.append(c);
            }
        }
        String name = sb.toString();

        // 2. Initial period check
        if (name.startsWith(".")) {
            name = "_" + name.substring(1);
        }

        // 3. Reserved Windows filenames (check parts)
        String[] parts = name.split("\\.");
        List<String> newParts = new java.util.ArrayList<>();
        java.util.Set<String> reserved = java.util.Set.of(
            "con", "prn", "aux", "clock$", "nul", 
            "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
            "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"
        );
        for (String part : parts) {
            if (reserved.contains(part.toLowerCase())) {
                newParts.add("_" + part);
            } else {
                newParts.add(part);
            }
        }
        name = String.join(".", newParts);

        // 4. Collision handling
        // We compare against existing lower-cased file names + .glif (since existingOriginals stores full filenames)
        // Adjust existingOriginals usage: passed Set contains lower-cased "filename.glif" strings.
        
        String candidate = name;
        // Truncate to 255 (minus extension length 5 for .glif) -> 250
        if (candidate.length() > 250) candidate = candidate.substring(0, 250);

        String candidateFull = candidate + ".glif";
        
        if (!existingOriginals.contains(candidateFull.toLowerCase())) {
            return candidate;
        }

        // Handle clash 1 (append 15 digit number)
        // If clashing, we need to make space. Max length 255. 
        // 255 - 5 (.glif) - 15 (suffix) = 235 chars max for prefix.
        
        String prefix = candidate;
        if (prefix.length() > 235) prefix = prefix.substring(0, 235);
        
        long counter = 1;
        while (counter < 1000000000000000L) {
             String suffix = String.format("%015d", counter);
             String checkName = prefix + suffix;
             String checkFull = checkName + ".glif";
             if (!existingOriginals.contains(checkFull.toLowerCase())) {
                 return checkName;
             }
             counter++;
        }
        
        // Handle clash 2 (fallback, just numbers? Rare case)
        return candidate + "_" + System.currentTimeMillis(); // Fallback
    }

    private String createMetaInfo() {
        return """
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>creator</key>
    <string>com.fontogether</string>
    <key>formatVersion</key>
    <integer>3</integer>
</dict>
</plist>
""";
    }

    private String createLayerContents() {
        // Simple array of array: [["public.default", "glyphs"]]
        return """
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
    <array>
        <string>public.default</string>
        <string>glyphs</string>
    </array>
</array>
</plist>
""";
    }

    private String jsonToPlist(String jsonStr) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n");
        sb.append("<plist version=\"1.0\">\n");
        
        try {
            if (jsonStr == null || jsonStr.isEmpty()) {
                sb.append("<dict/>\n");
            } else {
                JsonNode root = objectMapper.readTree(jsonStr);
                buildPlistNode(sb, root);
            }
        } catch (Exception e) {
            sb.append("<dict/>"); // Fallback
        }
        
        sb.append("</plist>");
        return sb.toString();
    }

    private void buildPlistNode(StringBuilder sb, JsonNode node) {
        if (node.isObject()) {
            sb.append("<dict>\n");
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                sb.append("  <key>").append(field.getKey()).append("</key>\n");
                buildPlistNode(sb, field.getValue());
            }
            sb.append("</dict>\n");
        } else if (node.isArray()) {
            sb.append("<array>\n");
            for (JsonNode item : node) {
                buildPlistNode(sb, item);
            }
            sb.append("</array>\n");
        } else if (node.isTextual()) {
            String text = node.asText();
            if (text.startsWith("DATA:")) {
                sb.append("<data>").append(text.substring(5)).append("</data>\n");
            } else {
                sb.append("<string>").append(text).append("</string>\n");
            }
        } else if (node.isInt()) {
            sb.append("<integer>").append(node.asInt()).append("</integer>\n");
        } else if (node.isFloatingPointNumber()) {
            sb.append("<real>").append(node.asDouble()).append("</real>\n");
        } else if (node.isBoolean()) {
            sb.append(node.asBoolean() ? "<true/>\n" : "<false/>\n");
        } else {
             // Null or unknown -> ignore or empty string
             // sb.append("<string></string>\n");
        }
    }

    private String jsonToFea(String jsonStr) {
        StringBuilder sb = new StringBuilder();
        if (jsonStr == null || jsonStr.isEmpty()) return "";

        try {
            JsonNode root = objectMapper.readTree(jsonStr);
            
            // 1. Languagesystems
            if (root.has("languagesystems")) {
                for (JsonNode lang : root.get("languagesystems")) {
                    sb.append(lang.asText()).append("\n");
                }
            }
            
            // 2. Classes
            if (root.has("classes")) {
                for (JsonNode cls : root.get("classes")) {
                    String className = cls.get("name").asText();
                    if (!className.startsWith("@")) {
                        sb.append("@");
                    }
                    sb.append(className).append(" = [")
                      .append(cls.get("code").asText()).append("];\n");
                }
            }
            
            // 3. System Tables
            if (root.has("tables")) {
                for (JsonNode tbl : root.get("tables")) {
                    sb.append("table ").append(tbl.get("tag").asText()).append(" {\n")
                      .append(tbl.get("code").asText()).append("\n} ")
                      .append(tbl.get("tag").asText()).append(";\n");
                }
            }

            // 4. Lookups (Standalone)
            if (root.has("lookups")) {
                for (JsonNode lkp : root.get("lookups")) {
                    sb.append("lookup ").append(lkp.get("name").asText()).append(" {\n")
                      .append(lkp.get("code").asText()).append("\n} ")
                      .append(lkp.get("name").asText()).append(";\n");
                }
            }

            // 5. Features
            if (root.has("features")) {
                for (JsonNode feat : root.get("features")) {
                    sb.append("feature ").append(feat.get("tag").asText()).append(" {\n")
                      .append(feat.get("code").asText()).append("\n} ")
                      .append(feat.get("tag").asText()).append(";\n");
                }
            }
            
            // 6. Prefix (Arbitrary code)
            if (root.has("prefix")) {
                 sb.append(root.get("prefix").asText()).append("\n");
            }

        } catch (Exception e) {
            return "# Error parsing features JSON";
        }
        return sb.toString();
    }

    private String glyphToGlif(Glyph glyph) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<glyph name=\"").append(glyph.getGlyphName()).append("\" format=\"2\">\n");
        
        // 1. Advance
        sb.append("  <advance width=\"").append(glyph.getAdvanceWidth())
          .append("\" height=\"").append(glyph.getAdvanceHeight()).append("\"/>\n");
        
        // 2. Unicode
        if (glyph.getUnicodes() != null) {
            for (String hex : glyph.getUnicodes()) {
                sb.append("  <unicode hex=\"").append(hex).append("\"/>\n");
            }
        }
        
        // 3. Outline
        sb.append("  <outline>\n");
        try {
            JsonNode outline = objectMapper.readTree(glyph.getOutlineData());
            
            // Contours
            if (outline.has("contours")) {
                for (JsonNode contour : outline.get("contours")) {
                    sb.append("    <contour>\n");
                    if (contour.has("points")) {
                        for (JsonNode p : contour.get("points")) {
                            sb.append("      <point x=\"").append((int) p.get("x").asDouble())
                              .append("\" y=\"").append((int) p.get("y").asDouble())
                              .append("\" type=\"").append(p.has("type") ? p.get("type").asText() : "offcurve");
                            
                            if (p.has("smooth") && p.get("smooth").asBoolean()) {
                                sb.append("\" smooth=\"yes");
                            }
                            sb.append("\"/>\n");
                        }
                    }
                    sb.append("    </contour>\n");
                }
            }
            
            // Components
            if (outline.has("components")) {
                for (JsonNode comp : outline.get("components")) {
                    sb.append("    <component base=\"").append(comp.get("base").asText()).append("\"");
                    if (comp.has("xScale")) sb.append(" xScale=\"").append(comp.get("xScale").asDouble()).append("\"");
                    if (comp.has("xyScale")) sb.append(" xyScale=\"").append(comp.get("xyScale").asDouble()).append("\"");
                    if (comp.has("yxScale")) sb.append(" yxScale=\"").append(comp.get("yxScale").asDouble()).append("\"");
                    if (comp.has("yScale")) sb.append(" yScale=\"").append(comp.get("yScale").asDouble()).append("\"");
                    if (comp.has("xOffset")) sb.append(" xOffset=\"").append(comp.get("xOffset").asDouble()).append("\"");
                    if (comp.has("yOffset")) sb.append(" yOffset=\"").append(comp.get("yOffset").asDouble()).append("\"");
                    sb.append("/>\n");
                }
            }
            
        } catch (Exception e) {
            // ignore malformed outline json
        }
        sb.append("  </outline>\n");
        
        sb.append("</glyph>");
        return sb.toString();
    }
}
