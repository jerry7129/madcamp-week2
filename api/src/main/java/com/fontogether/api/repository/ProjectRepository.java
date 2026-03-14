package com.fontogether.api.repository;

import com.fontogether.api.model.domain.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ProjectRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Project> projectRowMapper = new RowMapper<>() {
        @Override
        public Project mapRow(ResultSet rs, int rowNum) throws SQLException {
            return Project.builder()
                    .projectId(rs.getLong("project_id"))
                    .title(rs.getString("title"))
                    .ownerId(rs.getLong("owner_id"))
                    .metaInfo(rs.getString("meta_info"))
                    .fontInfo(rs.getString("font_info"))
                    .groups(rs.getString("groups"))
                    .kerning(rs.getString("kerning"))
                    .features(rs.getString("features"))
                    .features(rs.getString("features"))
                    .layerConfig(rs.getString("layer_config"))
                    .lib(rs.getString("lib"))
                    .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                    .updatedAt(rs.getTimestamp("updated_at").toLocalDateTime())
                    .build();
        }
    };

    /**
     * Find all projects where the user is an owner OR a collaborator.
     */
    public List<Project> findAllByUserId(Long userId) {
        String sql = """
            SELECT DISTINCT p.project_id, p.title, p.owner_id, p.meta_info, p.font_info, 
                            p.groups, p.kerning, p.features, p.layer_config, p.lib, 
                            p.created_at, p.updated_at,
                            u.nickname as owner_nickname, u.email as owner_email,
                            CASE WHEN p.owner_id = ? THEN 'OWNER' ELSE 'EDITOR' END as role,
                            (SELECT COUNT(*) FROM project_collaborators pc_check WHERE pc_check.project_id = p.project_id) as collaborator_count
            FROM font_project p
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN project_collaborators pc ON p.project_id = pc.project_id
            WHERE p.owner_id = ? OR pc.user_id = ?
            ORDER BY p.updated_at DESC
        """;
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Project p = projectRowMapper.mapRow(rs, rowNum);
            
            // Enrich with extra fields
            p.setOwnerNickname(rs.getString("owner_nickname"));
            p.setOwnerEmail(rs.getString("owner_email"));
            
            String role = rs.getString("role");
            p.setRole(role);
            
            int collaboratorCount = rs.getInt("collaborator_count");
            // isShared is true if I am NOT owner OR if there are collaborators
            boolean isShared = !"OWNER".equals(role) || collaboratorCount > 0;
            p.setIsShared(isShared);
            
            return p;
        }, userId, userId, userId);
    }
    public Long save(Project project) {
        String sql = "INSERT INTO font_project (title, owner_id, meta_info, font_info, groups, kerning, features, layer_config, lib) " +
                     "VALUES (?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb)";
        
        org.springframework.jdbc.support.KeyHolder keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            java.sql.PreparedStatement ps = connection.prepareStatement(sql, new String[]{"project_id"});
            ps.setString(1, project.getTitle());
            ps.setLong(2, project.getOwnerId());
            ps.setString(3, project.getMetaInfo());
            ps.setString(4, project.getFontInfo());
            ps.setString(5, project.getGroups());
            ps.setString(6, project.getKerning());
            ps.setString(7, project.getFeatures());
            ps.setString(8, project.getLayerConfig());
            ps.setString(9, project.getLib());
            return ps;
        }, keyHolder);

        return keyHolder.getKey().longValue();
    }

    public java.util.Optional<Project> findById(Long projectId) {
        String sql = "SELECT * FROM font_project WHERE project_id = ?";
        try {
            Project project = jdbcTemplate.queryForObject(sql, projectRowMapper, projectId);
            return java.util.Optional.ofNullable(project);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return java.util.Optional.empty();
        }
    }

    public void update(Project project) {
        String sql = "UPDATE font_project SET title = ?, updated_at = NOW() WHERE project_id = ?";
        jdbcTemplate.update(sql, project.getTitle(), project.getProjectId());
    }

    public void deleteById(Long projectId) {
        String sql = "DELETE FROM font_project WHERE project_id = ?";
        jdbcTemplate.update(sql, projectId);
    }

    public void deleteByOwnerId(Long ownerId) {
        String sql = "DELETE FROM font_project WHERE owner_id = ?";
        jdbcTemplate.update(sql, ownerId);
    }

    public List<Long> findProjectIdsByOwnerId(Long ownerId) {
        String sql = "SELECT project_id FROM font_project WHERE owner_id = ?";
        return jdbcTemplate.queryForList(sql, Long.class, ownerId);
    }

    public void transferOwnership(Long projectId, Long newOwnerId) {
        // Update owner
        String updateSql = "UPDATE font_project SET owner_id = ? WHERE project_id = ?";
        jdbcTemplate.update(updateSql, newOwnerId, projectId);
        // Remove the new owner from collaborators list (they are now the owner)
        String deleteSql = "DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?";
        jdbcTemplate.update(deleteSql, projectId, newOwnerId);
    }

    public java.util.Optional<Long> findFirstCollaboratorIdExcluding(Long projectId, Long excludeUserId) {
        String sql = "SELECT user_id FROM project_collaborators WHERE project_id = ? AND user_id != ? ORDER BY joined_at ASC LIMIT 1";
        try {
            Long id = jdbcTemplate.queryForObject(sql, Long.class, projectId, excludeUserId);
            return java.util.Optional.ofNullable(id);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return java.util.Optional.empty();
        }
    }

    public void updateProjectDetail(Long projectId, String column, String data) {
        // Validate column name to prevent SQL injection (Allowed list)
        if (!java.util.Set.of("meta_info", "font_info", "groups", "kerning", "features", "layer_config", "lib").contains(column)) {
            throw new IllegalArgumentException("Invalid column name: " + column);
        }

        String sql = "UPDATE font_project SET " + column + " = ?::jsonb, updated_at = NOW() WHERE project_id = ?";
        
        jdbcTemplate.update(sql, data, projectId);
    }

    public void updateTimestamp(Long projectId) {
        String sql = "UPDATE font_project SET updated_at = NOW() WHERE project_id = ?";
        jdbcTemplate.update(sql, projectId);
    }

    // --- Collaboration Methods ---

    public List<Collaborator> findCollaborators(Long projectId) {
        String sql = """
            SELECT u.id, u.nickname, u.email, pc.role, pc.joined_at
            FROM project_collaborators pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.project_id = ?
        """;
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Collaborator c = new Collaborator();
            c.setUserId(rs.getLong("id"));
            c.setNickname(rs.getString("nickname"));
            c.setEmail(rs.getString("email"));
            c.setRole(rs.getString("role"));
            c.setJoinedAt(rs.getTimestamp("joined_at").toLocalDateTime());
            return c;
        }, projectId);
    }

    public void addCollaborator(Long projectId, Long userId, String role) {
        String sql = "INSERT INTO project_collaborators (project_id, user_id, role) VALUES (?, ?, ?)";
        jdbcTemplate.update(sql, projectId, userId, role);
    }

    public void updateCollaboratorRole(Long projectId, Long userId, String newRole) {
        String sql = "UPDATE project_collaborators SET role = ? WHERE project_id = ? AND user_id = ?";
        jdbcTemplate.update(sql, newRole, projectId, userId);
    }

    public void removeCollaborator(Long projectId, Long userId) {
        String sql = "DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?";
        jdbcTemplate.update(sql, projectId, userId);
    }

    @lombok.Data
    public static class Collaborator {
        private Long userId;
        private String nickname;
        private String email;
        private String role;
        private java.time.LocalDateTime joinedAt;
    }
}
