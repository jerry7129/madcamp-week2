package com.fontogether.api.service;

import com.fontogether.api.model.domain.Glyph;
import com.fontogether.api.repository.GlyphRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GlyphService {

    private final GlyphRepository glyphRepository;
    private final com.fontogether.api.repository.ProjectRepository projectRepository;

    /**
     * 글리프 저장 (Upsert 로직)
     * - 이미 존재하는 글자라면? -> Update
     * - 없는 글자라면? -> Insert
     */
    @Transactional
    public void saveGlyph(Long projectId, String glyphName, String outlineData, Integer width, List<String> unicodes) {
        
        // 1. DB에 이미 있는지 확인 (By Name, not Unicode anymore as primary lookup)
        Optional<Glyph> existing = glyphRepository.findByProjectAndName(projectId, glyphName);

        if (existing.isPresent()) {
            // 2-1. 있으면 업데이트
            Glyph glyph = existing.get();
            glyph.setOutlineData(outlineData);
            glyph.setAdvanceWidth(width);
            if (unicodes != null) {
                glyph.setUnicodes(unicodes);
            }
            
            glyphRepository.update(glyph);
        } else {
            // 2-2. 없으면 새로 생성
            Glyph newGlyph = Glyph.builder()
                    .projectId(projectId)
                    .glyphName(glyphName)
                    .unicodes(unicodes != null ? unicodes : List.of()) 
                    .advanceWidth(width)
                    .advanceHeight(1000) // Default height
                    .layerName("public")
                    .formatVersion(3)
                    .properties("{}")
                    .outlineData(outlineData)
                    .build();
            
            glyphRepository.save(newGlyph);
        }
        
        // 3. 프로젝트 UpdatedAt 갱신
        projectRepository.updateTimestamp(projectId);
    }

    /**
     * 글리프 조회
     */
    public Glyph getGlyph(Long projectId, String glyphName) {
        return glyphRepository.findByProjectAndName(projectId, glyphName)
                .orElseGet(() -> Glyph.builder()
                        .projectId(projectId)
                        .glyphName(glyphName)
                        .unicodes(List.of())
                        .advanceWidth(500)
                        .advanceHeight(1000)
                        .layerName("public")
                        .outlineData("{\"contours\":[]}")
                        .build());
    }

    /**
     * 프로젝트의 모든 글리프 조회
     */
    public List<Glyph> getAllGlyphs(Long projectId) {
        return glyphRepository.findAllByProjectId(projectId);
    }

    @Transactional
    public void deleteGlyph(Long projectId, String glyphName) {
        Glyph glossary = glyphRepository.findByProjectAndName(projectId, glyphName)
                .orElseThrow(() -> new IllegalArgumentException("Glyph not found: " + glyphName));
        
        glyphRepository.delete(glossary);
        projectRepository.updateTimestamp(projectId);
    }

    @Transactional
    public void renameGlyph(Long projectId, String oldName, String newName) {
        Glyph glyph = glyphRepository.findByProjectAndName(projectId, oldName)
                .orElseThrow(() -> new IllegalArgumentException("Glyph not found: " + oldName));
        
        Optional<Glyph> target = glyphRepository.findByProjectAndName(projectId, newName);
        if (target.isPresent()) {
            throw new IllegalArgumentException("Glyph name already exists: " + newName);
        }

        glyph.setGlyphName(newName);
        glyphRepository.update(glyph);
        glyph.setGlyphName(newName);
        glyphRepository.update(glyph);
        projectRepository.updateTimestamp(projectId);
    }

    @Transactional
    public void updateGlyphOrders(Long projectId, List<String> glyphNames) {
        for (int i = 0; i < glyphNames.size(); i++) {
            glyphRepository.updateSortOrder(projectId, glyphNames.get(i), i);
        }
        projectRepository.updateTimestamp(projectId);
    }
}