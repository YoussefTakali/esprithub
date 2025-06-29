import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-teacher-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TeacherTasksComponent implements OnInit {
  teacherClasses: any[] = [];
  selectedProject: any = null;
  searchTerm: string = '';
  filteredTasks: any[] = [];
  selectedClass: any = null;

  constructor(
    private readonly teacherData: TeacherDataService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.teacherData.getMyClasses().subscribe(classes => {
      this.teacherClasses = classes;
      this.route.queryParamMap.subscribe(params => {
        const classId = params.get('classId');
        if (classId) {
          const foundClass = this.teacherClasses.find(c => c.id == classId);
          if (foundClass) {
            this.selectedClass = foundClass;
            foundClass.expanded = true;
            if (foundClass.projects && foundClass.projects.length > 0) {
              this.selectProject(foundClass.projects[0]);
            } else {
              this.selectedProject = null;
              // Fetch tasks for the class from backend
              this.teacherData.getTasksByClassId(classId).subscribe(tasks => {
                this.filteredTasks = tasks;
              });
            }
            return;
          }
        }
        this.selectFirstProject();
      });
    });
  }

  selectFirstProject() {
    for (const classe of this.teacherClasses) {
      if (classe.projects && classe.projects.length > 0) {
        this.selectProject(classe.projects[0]);
        break;
      }
    }
  }

  selectProject(project: any) {
    this.selectedProject = project;
    if (project?.id) {
      this.teacherData.getTasksByProjectId(project.id).subscribe(tasks => {
        this.filteredTasks = tasks;
      });
    } else {
      this.filteredTasks = project?.tasks ?? [];
    }
  }

  filterByClass(classe: any) {
    // Optionally, filter tasks by class
    this.selectedProject = null;
    this.filteredTasks = classe.projects?.flatMap((p: any) => p.tasks) ?? [];
  }

  filterByGroup(group: any) {
    // Optionally, filter tasks by group
    this.selectedProject = null;
    this.filteredTasks = group.tasks ?? [];
  }

  filterByStudent(studentId: any) {
    // Optionally, filter tasks assigned to a student
    this.filteredTasks = this.teacherClasses
      .flatMap((c: any) => c.projects)
      .flatMap((p: any) => p.tasks)
      .filter((t: any) => t.assignedTo?.includes(studentId));
  }

  // Toggle expand/collapse for a class
  toggleClass(classe: any) {
    classe.expanded = !classe.expanded;
  }

  // Toggle expand/collapse for a project
  toggleProject(project: any) {
    project.expanded = !project.expanded;
  }

  // Add to project (placeholder)
  addToProject(project: any, classId: any) {
    // Implement add to project logic here
    alert('Add to project: ' + project.name);
  }

  // Toggle expand/collapse for a group
  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  // Open add member modal (placeholder)
  openAddMemberModal(group: any) {
    // Implement modal logic here
    alert('Open add member modal for group: ' + group.name);
  }

  // Confirm remove group (placeholder)
  confirmRemoveGroup(group: any) {
    // Implement remove group logic here
    alert('Remove group: ' + group.name);
  }

  // Get student name by ID (placeholder)
  getStudentName(id: any): string {
    // Implement lookup logic here
    return 'Student ' + id;
  }

  // Convert string to number (utility)
  StringToNumber(val: any): number {
    return Number(val);
  }

  // Confirm remove member (placeholder)
  confirmRemoveMember(group: any, studentId: any) {
    // Implement remove member logic here
    alert('Remove member ' + studentId + ' from group ' + group.name);
  }

  // Add task (placeholder)
  addTask() {
    // Implement add task logic here
    alert('Add new task');
  }
}
