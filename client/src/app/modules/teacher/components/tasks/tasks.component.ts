import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CreateGroupDialogComponent } from '../groups/create-group-dialog.component';
import { FormBuilder } from '@angular/forms';
import { SnackbarService } from 'src/app/shared/services/snackbar.service';

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

  // Modal state
  showCreateGroupModal = false;
  showAddMemberModal = false;
  showRemoveGroupModal = false;
  showRemoveMemberModal = false;
  groupToDelete: any = null;
  groupToAddMember: any = null;
  groupToRemoveMember: any = null;
  memberToRemove: any = null;

  // For group creation
  createGroupProject: any = null;
  createGroupClassId: string | null = null;
  availableStudentsForGroup: any[] = [];
  groupNameInput: string = '';
  groupMembersInput: string = '';
  groupMemberSuggestions: any[] = [];
  selectedGroupMembers: any[] = [];

  // For add member
  addMemberInput: string = '';
  addMemberSuggestions: any[] = [];

  constructor(
    private readonly teacherData: TeacherDataService,
    private readonly route: ActivatedRoute,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackbar: SnackbarService
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
        projects: (c.projects || []).map((proj: any) => ({
          ...proj,
          groups: (proj.groups || []).map((g: any) => ({
            ...g,
            memberIds: g.studentIds ?? []
          }))
        }))
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

  // Toggle expand/collapse for a group
  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  // Open dialog to create a group under a project
  openCreateGroupModal(project: any, classId: string) {
    this.createGroupProject = project;
    this.createGroupClassId = classId;
    this.groupNameInput = '';
    this.selectedGroupMembers = [];
    this.groupMembersInput = '';
    this.groupMemberSuggestions = [];
    this.teacherData.getStudentsByClassId(classId).subscribe((students: any[]) => {
      // Exclude students already in a group for this project/class
      const usedIds = (project.groups || []).flatMap((g: any) => g.memberIds || []);
      this.availableStudentsForGroup = students.filter(s => !usedIds.includes(s.id));
      this.showCreateGroupModal = true;
    });
  }
  closeCreateGroupModal() {
    this.showCreateGroupModal = false;
  }
  onGroupMemberInput() {
    const term = this.groupMembersInput.toLowerCase();
    this.groupMemberSuggestions = this.availableStudentsForGroup.filter(s =>
      (s.fullName || s.name || s.email).toLowerCase().includes(term) &&
      !this.selectedGroupMembers.some(m => m.id === s.id)
    );
  }
  selectGroupMember(s: any) {
    this.selectedGroupMembers.push(s);
    this.groupMembersInput = '';
    this.groupMemberSuggestions = [];
  }
  removeGroupMember(id: string) {
    this.selectedGroupMembers = this.selectedGroupMembers.filter(m => m.id !== id);
  }
  createGroupSubmit() {
    if (!this.groupNameInput.trim() || this.selectedGroupMembers.length === 0) {
      this.snackbar.showError('Group name and at least one member are required.');
      return;
    }
    const groupPayload = {
      name: this.groupNameInput,
      projectId: this.createGroupProject.id,
      classeId: this.createGroupClassId,
      studentIds: this.selectedGroupMembers.map(m => m.id)
    };
    this.teacherData.createGroup(groupPayload).subscribe({
      next: () => {
        this.refreshTree(this.createGroupClassId ?? undefined, this.createGroupProject.id ?? undefined);
        this.snackbar.showSuccess('Group created successfully!');
        this.closeCreateGroupModal();
      },
      error: () => this.snackbar.showError('Failed to create group.')
    });
  }

  // Add member modal logic
  openAddMemberModal(group: any) {
    this.groupToAddMember = group;
    this.addMemberInput = '';
    this.addMemberSuggestions = [];
    let classId: string | null = null;
    let projectId: string | null = null;
    for (const classe of this.teacherClasses) {
      for (const project of classe.projects) {
        if (project.groups && project.groups.includes(group)) {
          classId = classe.classId;
          projectId = project.id;
          break;
        }
      }
    }
    if (!classId || !projectId) return;
    this.teacherData.getStudentsByClassId(classId).subscribe((students: any[]) => {
      const usedIds = group.memberIds || [];
      this.availableStudentsForGroup = students.filter(s => !usedIds.includes(s.id));
      this.showAddMemberModal = true;
    });
  }
  closeAddMemberModal() {
    this.showAddMemberModal = false;
  }
  onAddMemberInput() {
    const term = this.addMemberInput.toLowerCase();
    this.addMemberSuggestions = this.availableStudentsForGroup.filter(s =>
      (s.fullName || s.name || s.email).toLowerCase().includes(term)
    );
  }
  selectAddMember(s: any) {
    if (!this.groupToAddMember) return;
    let classId: string | null = null;
    let projectId: string | null = null;
    for (const classe of this.teacherClasses) {
      for (const project of classe.projects) {
        if (project.groups && project.groups.includes(this.groupToAddMember)) {
          classId = classe.classId;
          projectId = project.id;
          break;
        }
      }
    }
    if (!classId || !projectId) return;
    const updatedGroup = {
      id: this.groupToAddMember.id,
      name: this.groupToAddMember.name,
      classeId: classId,
      projectId: projectId,
      studentIds: [...(this.groupToAddMember.memberIds || []), s.id]
    };
    this.teacherData.updateGroup(this.groupToAddMember.id, updatedGroup).subscribe({
      next: () => {
        this.refreshTree(classId ?? undefined, projectId ?? undefined);
        this.snackbar.showSuccess('Member added to group!');
        this.closeAddMemberModal();
      },
      error: () => this.snackbar.showError('Failed to add member.')
    });
  }

  // Remove group modal logic
  confirmRemoveGroup(group: any) {
    this.groupToDelete = group;
    this.showRemoveGroupModal = true;
  }
  closeRemoveGroupModal() {
    this.showRemoveGroupModal = false;
  }
  removeGroupSubmit() {
    if (!this.groupToDelete) return;
    this.teacherData.deleteGroup(this.groupToDelete.id).subscribe({
      next: () => {
        this.refreshTree();
        this.snackbar.showSuccess('Group removed successfully!');
        this.closeRemoveGroupModal();
      },
      error: () => this.snackbar.showError('Failed to remove group.')
    });
  }

  // Remove member modal logic
  confirmRemoveMember(group: any, studentId: any) {
    this.groupToRemoveMember = group;
    this.memberToRemove = studentId;
    this.showRemoveMemberModal = true;
  }
  closeRemoveMemberModal() {
    this.showRemoveMemberModal = false;
  }
  removeMemberSubmit() {
    if (!this.groupToRemoveMember || !this.memberToRemove) return;
    let classId: string | null = null;
    let projectId: string | null = null;
    for (const classe of this.teacherClasses) {
      for (const project of classe.projects) {
        if (project.groups && project.groups.includes(this.groupToRemoveMember)) {
          classId = classe.classId;
          projectId = project.id;
          break;
        }
      }
    }
    const remainingIds = this.groupToRemoveMember.memberIds.filter((id: string) => id !== this.memberToRemove);
    if (remainingIds.length === 0) {
      this.snackbar.showError('A group must have at least one member.');
      return;
    }
    const updatedGroup = {
      id: this.groupToRemoveMember.id,
      name: this.groupToRemoveMember.name,
      classeId: classId,
      projectId: projectId,
      studentIds: remainingIds
    };
    this.teacherData.updateGroup(this.groupToRemoveMember.id, updatedGroup).subscribe({
      next: () => {
        this.refreshTree(classId ?? undefined, projectId ?? undefined);
        this.snackbar.showSuccess('Member removed from group!');
        this.closeRemoveMemberModal();
      },
      error: () => this.snackbar.showError('Failed to remove member.')
    });
  }

  getStudentName(studentId: string): string {
    const student = this.studentMap[studentId];
    return student?.fullName || (student?.firstName && student?.lastName ? student.firstName + ' ' + student.lastName : student?.firstName || student?.lastName || student?.email || studentId);
  }

  // Add task (placeholder)
  addTask() {
    // Implement add task logic here
    alert('Add new task');
  }

  // Helper to refresh the tree view from backend
  refreshTree(classId?: string, projectId?: string) {
    this.teacherData.getMyClassesWithCourses().subscribe(classes => {
      this.teacherClasses = classes.map(c => ({
        ...c,
        projects: (c.projects || []).map((proj: any) => ({
          ...proj,
          groups: (proj.groups || []).map((g: any) => ({
            ...g,
            memberIds: g.studentIds ?? []
          }))
        }))
      }));
      // Optionally, re-select the current class and project
      if (classId) {
        const updatedClass = this.teacherClasses.find(c => c.classId === classId);
        if (updatedClass) {
          this.selectedClass = updatedClass;
          if (projectId) {
            const updatedProject = updatedClass.projects.find((p: any) => p.id === projectId);
            if (updatedProject) {
              this.selectProject(updatedProject);
            }
          }
        }
      }
    });
  }
}
