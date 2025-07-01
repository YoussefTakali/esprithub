package tn.esprithub.server.repository.service;

import tn.esprithub.server.repository.dto.FileUploadDto;
import tn.esprithub.server.repository.dto.RepositoryDto;
import tn.esprithub.server.repository.dto.RepositoryStatsDto;

import java.util.List;

public interface RepositoryService {
    
    List<RepositoryDto> getTeacherRepositories(String teacherEmail);
    
    RepositoryStatsDto getRepositoryStats(String repoFullName, String teacherEmail);
    
    String uploadFile(String repoFullName, FileUploadDto uploadDto, String teacherEmail);
    
    List<String> getRepositoryFiles(String repoFullName, String branch, String teacherEmail);
    
    List<String> getRepositoryBranches(String repoFullName, String teacherEmail);
    
    String deleteFile(String repoFullName, String filePath, String commitMessage, String branch, String teacherEmail);
}
