package tn.esprithub.server.project.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import tn.esprithub.server.common.entity.BaseEntity;
import tn.esprithub.server.user.entity.User;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "submissions")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Submission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SubmissionStatus status;

    @Column(name = "grade")
    private Double grade;

    @Column(name = "max_grade")
    private Double maxGrade;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy;

    @Builder.Default
    @Column(name = "is_late", nullable = false)
    private Boolean isLate = false;

    @Builder.Default
    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber = 1;

    @Builder.Default
    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubmissionFile> files = new ArrayList<>();

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = SubmissionStatus.SUBMITTED;
        }
        // Check if submission is late
        if (task != null && task.getDueDate() != null) {
            isLate = submittedAt.isAfter(task.getDueDate());
        }
    }

    public enum SubmissionStatus {
        DRAFT,
        SUBMITTED,
        GRADED,
        RETURNED,
        RESUBMITTED
    }

    // Helper methods
    public boolean isGraded() {
        return status == SubmissionStatus.GRADED && grade != null;
    }

    public boolean isPassing() {
        if (grade == null || maxGrade == null) {
            return false;
        }
        return (grade / maxGrade) >= 0.5; // 50% passing grade
    }

    public double getGradePercentage() {
        if (grade == null || maxGrade == null) {
            return 0.0;
        }
        return (grade / maxGrade) * 100;
    }

    public void addFile(SubmissionFile file) {
        files.add(file);
        file.setSubmission(this);
    }

    public void removeFile(SubmissionFile file) {
        files.remove(file);
        file.setSubmission(null);
    }
}
