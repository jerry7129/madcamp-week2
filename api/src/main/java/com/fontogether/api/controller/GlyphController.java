package com.fontogether.api.controller;

import com.fontogether.api.model.domain.Glyph;
import com.fontogether.api.model.dto.GlyphUpdateMessage;
import com.fontogether.api.service.CollaborationService;
import com.fontogether.api.service.GlyphService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Glyph 관련 REST API 컨트롤러
 * 실시간 협업과 함께 사용하는 REST 엔드포인트
 */
@RestController
@RequestMapping("/api/projects/{projectId}/glyphs")
@RequiredArgsConstructor
public class GlyphController {

    private final GlyphService glyphService;
    private final CollaborationService collaborationService;

    /**
     * 특정 글리프 조회
     * GET /api/projects/{projectId}/glyphs/{unicode}
     */
    /**
     * 특정 글리프 조회
     * GET /api/projects/{projectId}/glyphs/{glyphName}
     */
    @GetMapping("/{glyphName}")
    public ResponseEntity<Glyph> getGlyph(
            @PathVariable Long projectId,
            @PathVariable String glyphName) {
        Glyph glyph = glyphService.getGlyph(projectId, glyphName);
        return ResponseEntity.ok(glyph);
    }

    /**
     * 프로젝트의 모든 글리프 조회
     * GET /api/projects/{projectId}/glyphs
     */
    @GetMapping
    public ResponseEntity<List<Glyph>> getAllGlyphs(@PathVariable Long projectId) {
        List<Glyph> glyphs = glyphService.getAllGlyphs(projectId);
        return ResponseEntity.ok(glyphs);
    }

    /**
     * 글리프 저장/업데이트 (REST API)
     * POST /api/projects/{projectId}/glyphs
     */
    @PostMapping
    public ResponseEntity<Glyph> saveGlyph(
            @PathVariable Long projectId,
            @RequestBody GlyphUpdateMessage request) {
        
        glyphService.saveGlyph(
                projectId,
                request.getGlyphName(),
                request.getOutlineData(),
                request.getAdvanceWidth(),
                request.getUnicodes()
        );

        // 실시간 브로드캐스트
        collaborationService.broadcastGlyphUpdate(projectId, request);

        Glyph savedGlyph = glyphService.getGlyph(projectId, request.getGlyphName());
        return ResponseEntity.ok(savedGlyph);
    }

    /**
     * 프로젝트에 접속 중인 사용자 수 조회
     * GET /api/projects/{projectId}/collaborators/count
     */
    @io.swagger.v3.oas.annotations.Operation(summary = "Get active user count", description = "Returns the number of users currently connected to the project via WebSocket.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Active user count", 
           content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = Integer.class, example = "3")))
    @GetMapping("/collaborators/count")
    public ResponseEntity<Integer> getActiveUserCount(@PathVariable Long projectId) {
        int count = collaborationService.getActiveUserCount(projectId);
        return ResponseEntity.ok(count);
    }
}
