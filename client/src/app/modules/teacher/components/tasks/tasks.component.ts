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

  // Add Task modal state
  showAddTaskModal = false;
  addTaskForm = {
    title: '',
    description: '',
    dueDate: '',
    scopeType: '', // 'PROJECT', 'CLASSE', 'GROUP', 'INDIVIDUAL'
    projectId: '', // Always required
    classId: '',
    groupId: '',
    studentId: '',
    isGraded: false,
    isVisible: true,
    status: 'DRAFT'
  };
  availableScopeProjects: any[] = [];
  availableScopeClasses: any[] = [];
  availableScopeGroups: any[] = [];
  availableScopeStudents: any[] = [];

  taskStatuses = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];

  constructor(
    private readonly teacherData: TeacherDataService,
    private readonly route: ActivatedRoute,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackbar: SnackbarService
  ) {}

  ngOnInit() {
    this.teacherData.getMyClassesWithCourses().subscribe(async classes => {
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
      // --- FIX: Ensure each class shows all projects assigned to it ---
      // 1. Collect all unique projects from all classes
      const allProjects: any[] = [];
      const projectMap: { [id: string]: any } = {};
      classes.forEach(c => {
        (c.projects || []).forEach((proj: any) => {
          if (!projectMap[proj.id]) {
            projectMap[proj.id] = { ...proj };
            allProjects.push(projectMap[proj.id]);
          }
        });
      });
      // 2. For each class, set its projects to all projects where the class is assigned
      //    and fetch groups for that class+project only
      this.teacherClasses = await Promise.all(classes.map(async c => {
        const projects = allProjects
          .filter((proj: any) => {
            if (proj.classIds && Array.isArray(proj.classIds)) {
              return proj.classIds.includes(c.classId);
            } else if (proj.classes && Array.isArray(proj.classes)) {
              return proj.classes.some((cl: any) => (cl.id ?? cl.classId) === c.classId);
            }
            return false;
          });
        // For each project, fetch groups for this class+project
        const projectsWithGroups = await Promise.all(projects.map(async (proj: any) => {
          const groups = await this.teacherData.getGroupsByProjectAndClass(proj.id, c.classId).toPromise();
          return {
            ...proj,
            groups: (groups || []).map((g: any) => ({
              ...g,
              memberIds: g.studentIds ?? []
            }))
          };
        }));
        return {
          ...c,
          projects: projectsWithGroups
        };
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
        // Map assignment names for display
        this.filteredTasks = (tasks || []).map((task: any) => {
          return {
            ...task,
            projectName: project.name,
            groupName: (task.groupId && project.groups) ? (project.groups.find((g: any) => g.id === task.groupId)?.name) : undefined,
            className: (this.teacherClasses.find((c: any) => c.classId === task.classeId)?.className),
          };
        });
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
    if (!term) {
      this.groupMemberSuggestions = this.availableStudentsForGroup.filter(s =>
        !this.selectedGroupMembers.some(m => m.id === s.id)
      );
    } else {
      this.groupMemberSuggestions = this.availableStudentsForGroup.filter(s =>
        (s.fullName || s.name || s.email).toLowerCase().includes(term) &&
        !this.selectedGroupMembers.some(m => m.id === s.id)
      );
    }
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

  // Add Task modal logic
  openAddTaskModal() {
    this.showAddTaskModal = true;
    this.addTaskForm = {
      title: '',
      description: '',
      dueDate: '',
      scopeType: '',
      projectId: '', // Always required
      classId: '',
      groupId: '',
      studentId: '',
      isGraded: false,
      isVisible: true,
      status: 'DRAFT'
    };
    // Only show unique projects for the current context
    // If a project is selected, only show that project
    if (this.selectedProject) {
      this.availableScopeProjects = [this.selectedProject];
    } else {
      // Otherwise, show unique projects (no duplicates)
      const seen = new Set();
      this.availableScopeProjects = this.teacherClasses
        .flatMap(c => c.projects)
        .filter((proj: any) => {
          if (seen.has(proj.id)) return false;
          seen.add(proj.id);
          return true;
        });
    }
    this.availableScopeClasses = this.teacherClasses;
    this.availableScopeGroups = this.teacherClasses.flatMap(c => c.projects.flatMap((p: any) => p.groups || []));
    this.availableScopeStudents = Object.values(this.studentMap);
  }
  closeAddTaskModal() {
    this.showAddTaskModal = false;
  }
  addTaskSubmit() {
    // Validate required fields
    if (!this.addTaskForm.title.trim() || !this.addTaskForm.dueDate || !this.addTaskForm.scopeType) {
      this.snackbar.showError('Title, deadline, and scope are required.');
      return;
    }
    if (this.addTaskForm.scopeType === 'PROJECT') {
      if (!this.addTaskForm.projectId) {
        this.snackbar.showError('Project is required for project scope.');
        return;
      }
      const payload: any = {
        title: this.addTaskForm.title,
        description: this.addTaskForm.description,
        dueDate: this.addTaskForm.dueDate,
        type: this.addTaskForm.scopeType,
        status: this.addTaskForm.status,
        isGraded: this.addTaskForm.isGraded,
        isVisible: this.addTaskForm.isVisible,
        projectId: this.addTaskForm.projectId
      };
      this.teacherData.createTask(payload).subscribe({
        next: () => {
          this.refreshTree();
          this.snackbar.showSuccess('Task created successfully!');
          this.closeAddTaskModal();
        },
        error: () => this.snackbar.showError('Failed to create task.')
      });
    } else if (this.addTaskForm.scopeType === 'CLASSE') {
      if (!this.addTaskForm.classId) {
        this.snackbar.showError('Class is required for class scope.');
        return;
      }
      // Assign to each group under that class in all projects
      const classObj = this.teacherClasses.find(c => c.classId === this.addTaskForm.classId);
      if (!classObj) {
        this.snackbar.showError('Class not found.');
        return;
      }
      const allGroups = classObj.projects.flatMap((p: any) => (p.groups || []).map((g: any) => ({
        groupId: g.id,
        projectId: p.id
      })));
      if (allGroups.length === 0) {
        this.snackbar.showError('No groups found under this class.');
        return;
      }
      let createdCount = 0;
      allGroups.forEach((item: { groupId: string; projectId: string }, idx: number) => {
        const { groupId, projectId } = item;
        const payload: any = {
          title: this.addTaskForm.title,
          description: this.addTaskForm.description,
          dueDate: this.addTaskForm.dueDate,
          type: 'GROUP',
          status: this.addTaskForm.status,
          isGraded: this.addTaskForm.isGraded,
          isVisible: this.addTaskForm.isVisible,
          projectId,
          groupId,
          classeId: this.addTaskForm.classId
        };
        this.teacherData.createTask(payload).subscribe({
          next: () => {
            createdCount++;
            if (createdCount === allGroups.length) {
              this.refreshTree();
              this.snackbar.showSuccess('Task created for all groups in class!');
              this.closeAddTaskModal();
            }
          },
          error: () => this.snackbar.showError('Failed to create task for a group.')
        });
      });
    } else if (this.addTaskForm.scopeType === 'GROUP') {
      if (!this.addTaskForm.groupId) {
        this.snackbar.showError('Group is required for group scope.');
        return;
      }
      // Find group and its project/class
      let foundGroup: any;
      let foundProject: any;
      let foundClass: any;
      for (const c of this.teacherClasses) {
        for (const p of c.projects) {
          const g = (p.groups || []).find((g: any) => g.id === this.addTaskForm.groupId);
          if (g) {
            foundGroup = g;
            foundProject = p;
            foundClass = c;
            break;
          }
        }
        if (foundGroup) break;
      }
      if (!foundGroup || !foundProject || !foundClass) {
        this.snackbar.showError('Group not found.');
        return;
      }
      const payload: any = {
        title: this.addTaskForm.title,
        description: this.addTaskForm.description,
        dueDate: this.addTaskForm.dueDate,
        type: 'GROUP',
        status: this.addTaskForm.status,
        isGraded: this.addTaskForm.isGraded,
        isVisible: this.addTaskForm.isVisible,
        projectId: foundProject.id,
        groupId: foundGroup.id,
        classeId: foundClass.classId
      };
      this.teacherData.createTask(payload).subscribe({
        next: () => {
          this.refreshTree();
          this.snackbar.showSuccess('Task created for group!');
          this.closeAddTaskModal();
        },
        error: () => this.snackbar.showError('Failed to create task for group.')
      });
    } else if (this.addTaskForm.scopeType === 'INDIVIDUAL') {
      if (!this.addTaskForm.studentId) {
        this.snackbar.showError('Student is required for individual scope.');
        return;
      }
      // Find student group/project/class
      let foundGroup: any;
      let foundProject: any;
      let foundClass: any;
      for (const c of this.teacherClasses) {
        for (const p of c.projects) {
          for (const g of (p.groups || [])) {
            if ((g.memberIds || []).includes(this.addTaskForm.studentId)) {
              foundGroup = g;
              foundProject = p;
              foundClass = c;
              break;
            }
          }
          if (foundGroup) break;
        }
        if (foundGroup) break;
      }
      if (!foundGroup || !foundProject || !foundClass) {
        this.snackbar.showError('Student not found in any group.');
        return;
      }
      const payload: any = {
        title: this.addTaskForm.title,
        description: this.addTaskForm.description,
        dueDate: this.addTaskForm.dueDate,
        type: 'INDIVIDUAL',
        status: this.addTaskForm.status,
        isGraded: this.addTaskForm.isGraded,
        isVisible: this.addTaskForm.isVisible,
        projectId: foundProject.id,
        groupId: foundGroup.id,
        classeId: foundClass.classId,
        studentId: this.addTaskForm.studentId
      };
      this.teacherData.createTask(payload).subscribe({
        next: () => {
          this.refreshTree();
          this.snackbar.showSuccess('Task created for student!');
          this.closeAddTaskModal();
        },
        error: () => this.snackbar.showError('Failed to create task for student.')
      });
    }
  }

  getStudentName(studentId: string): string {
    const student = this.studentMap[studentId];
    return student?.fullName || (student?.firstName && student?.lastName ? student.firstName + ' ' + student.lastName : student?.firstName || student?.lastName || student?.email || studentId);
  }

  // Add task (placeholder)
  addTask() {
    this.openAddTaskModal();
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
      // (implement logic here if needed)
    });
  }

  toggleStatusDropdown(task: any) {
    this.filteredTasks.forEach(t => { if (t !== task) t.showStatusDropdown = false; });
    task.showStatusDropdown = !task.showStatusDropdown;
  }

  changeTaskStatus(task: any, status: string) {
    task.status = status;
    task.showStatusDropdown = false;
    // TODO: Call backend to update status
    this.teacherData.updateTaskStatus(task.id, status).subscribe();
  }

  toggleTaskVisibility(task: any) {
    task.isVisible = !task.isVisible;
    // TODO: Call backend to update visibility
    this.teacherData.updateTaskVisibility(task.id, task.isVisible).subscribe();
  }
}
