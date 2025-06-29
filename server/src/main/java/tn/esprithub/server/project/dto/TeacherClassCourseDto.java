package tn.esprithub.server.project.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeacherClassCourseDto {
    private UUID classId;
    private String className;
    private String courseName;
}
