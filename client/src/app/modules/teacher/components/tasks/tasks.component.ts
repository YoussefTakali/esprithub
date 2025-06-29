import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CreateGroupDialogComponent } from '../groups/create-group-dialog.component';
import { FormBuilder } from '@angular/forms';

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

  // Map of studentId to student object for fast lookup
  studentMap: { [id: string]: any } = {};

  constructor(
    private readonly teacherData: TeacherDataService,
    private readonly route: ActivatedRoute,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.teacherData.getMyClassesWithCourses().subscribe(classes => {
      // Build student map for all classes
      const allStudentIds = new Set<string>();
      const studentFetches = classes.map(c =>
        this.teacherData.getStudentsByClassId(c.classId)
      );
      Promise.all(studentFetches.map(obs => obs.toPromise())).then(results => {
        results.forEach(students => {
          (students ?? []).forEach((s: any) => {
            this.studentMap[s.id] = s;
          });
        });
      });
      // Ensure each class has a projects array for UI compatibility
      this.teacherClasses = classes.map(c => ({
        ...c,
        projects: c.projects || []
      }));
      this.route.queryParamMap.subscribe(params => {
        const classId = params.get('classId');
        if (classId) {
          const foundClass = this.teacherClasses.find(c => c.classId == classId);
          if (foundClass) {
            this.selectedClass = foundClass;
            foundClass.expanded = true;
            if (foundClass.projects && foundClass.projects.length > 0) {
              this.selectProject(foundClass.projects[0]);
            } else {
              this.selectedProject = null;
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

  // Open dialog to create a group under a project
  addToProject(project: any, classId: any) {
    // Fetch students for this class (simulate or implement API call)
    this.teacherData.getStudentsByClassId(classId).subscribe((students: any[]) => {
      // Exclude students already in a group for this project/class
      const usedIds = (project.groups || []).flatMap((g: any) => g.memberIds || []);
      const availableStudents = students.filter(s => !usedIds.includes(s.id));
      const dialogRef = this.dialog.open(CreateGroupDialogComponent, {
        width: '400px',
        data: { students: availableStudents }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Add the new group to the project tree (simulate backend call)
          if (!project.groups) project.groups = [];
          project.groups.push({
            name: result.groupName,
            memberIds: result.members,
            expanded: false
          });
        }
      });
    });
  }

  // Toggle expand/collapse for a group
  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  // Open add member modal (placeholder)
  openAddMemberModal(group: any) {
    // Find class for this group
    let classId = null;
    outer: for (const classe of this.teacherClasses) {
      for (const project of classe.projects) {
        if (project.groups && project.groups.includes(group)) {
          classId = classe.classId;
          break outer;
        }
      }
    }
    if (!classId) return;
    this.teacherData.getStudentsByClassId(classId).subscribe((students: any[]) => {
      const usedIds = group.memberIds || [];
      const availableStudents = students.filter(s => !usedIds.includes(s.id));
      if (availableStudents.length === 0) {
        alert('No available students to add.');
        return;
      }
      const nameList = availableStudents.map(s => `${s.fullName || s.name || s.email}`).join('\n');
      const selected = prompt(`Enter the name of the student to add:\n${nameList}`);
      const found = availableStudents.find(s => (s.fullName || s.name || s.email) === selected);
      if (found) {
        group.memberIds.push(found.id);
      }
    });
  }

  // Confirm remove group (placeholder)
  confirmRemoveGroup(group: any) {
    const confirmed = confirm(`Are you sure you want to remove the group "${group.name}"?`);
    if (confirmed) {
      // Remove group from its parent project
      for (const classe of this.teacherClasses) {
        for (const project of classe.projects) {
          if (project.groups) {
            const idx = project.groups.indexOf(group);
            if (idx > -1) {
              project.groups.splice(idx, 1);
              return;
            }
          }
        }
      }
    }
  }

  // Get student name by ID (placeholder)
  getStudentName(id: any): string {
    const student = this.studentMap[id];
    return student ? (student.fullName || student.name || student.email || id) : 'Student ' + id;
  }

  // Convert string to number (utility)
  StringToNumber(val: any): number {
    return Number(val);
  }

  // Confirm remove member (placeholder)
  confirmRemoveMember(group: any, studentId: any) {
    const confirmed = confirm('Remove member ' + this.getStudentName(studentId) + ' from group ' + group.name + '?');
    if (confirmed) {
      const idx = group.memberIds.indexOf(studentId);
      if (idx > -1) group.memberIds.splice(idx, 1);
    }
  }

  // Add task (placeholder)
  addTask() {
    // Implement add task logic here
    alert('Add new task');
  }
}
