import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CreateGroupDialogComponent } from '../groups/create-group-dialog.component';
import { FormBuilder } from '@angular/forms';
import { SnackbarService } from 'src/app/shared/services/snackbar.service';
import { Task } from 'src/app/shared/models/task.model';
import { EditTaskDialogComponent } from '../tasks/edit-task-dialog.component';
import { EditTaskDialogModule } from './edit-task-dialog.module';
import { Group } from 'src/app/shared/models/group.model';

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

  // Group deletion options
  deleteRepositoryWithGroup = false;

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
  addTaskForm: {
    title: string;
    description: string;
    dueDate: string;
    scopeType: string;
    projectIds: string[];
    classIds: string[];
    groupIds: string[];
    studentIds: string[];
    isGraded: boolean;
    visible: boolean;
    status: string;
  } = {
    title: '',
    description: '',
    dueDate: '',
    scopeType: '',
    projectIds: [],
    classIds: [],
    groupIds: [],
    studentIds: [],
    isGraded: false,
    visible: true,
    status: 'DRAFT'
  };
  availableScopeProjects: any[] = [];
  availableScopeClasses: any[] = [];
  availableScopeGroups: any[] = [];
  availableScopeStudents: any[] = [];

  // Edit Task modal state
  showEditTaskModal = false;
  editTaskForm: any = {
    id: '',
    title: '',
    description: '',
    dueDate: '',
    status: 'DRAFT',
    isGraded: false,
    visible: true,
    projectIds: [],
    classIds: [],
    groupIds: [],
    studentIds: []
  };

  taskStatuses = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];

  repoCreationInProgress: boolean = false;
  repoCreationStep: 'none' | 'repo' | 'invite' | 'branch' = 'none';
  repoCreationStepMsg: string = '';
  createdRepoUrl: string = '';

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
      // After building teacherClasses, load all tasks by default
      this.teacherData.getMyTasks().subscribe(tasks => {
        // Map assignment names for display (multi-scope)
        this.filteredTasks = (tasks || []).map((task: any) => {
          // Collect all names for each scope
          const projectIds = Array.isArray(task.projectIds) ? task.projectIds : (task.projectId ? [task.projectId] : []);
          const classIds = Array.isArray(task.classeIds) ? task.classeIds : (task.classeId ? [task.classeId] : []);
          const groupIds = Array.isArray(task.groupIds) ? task.groupIds : (task.groupId ? [task.groupId] : []);
          const studentIds = Array.isArray(task.studentIds) ? task.studentIds : (task.studentId ? [task.studentId] : []);
          const projectNames = projectIds.map((id: string) => {
            const proj = classes.flatMap((c: any) => c.projects).find((p: any) => p.id === id);
            return proj?.name || id;
          }).filter(Boolean);
          const classNames = classIds.map((id: string) => {
            const c = classes.find((c: any) => c.classId === id);
            return c?.className || id;
          }).filter(Boolean);
          const groupNames = groupIds.map((id: string) => {
            const g = classes.flatMap((c: any) => c.projects).flatMap((p: any) => p.groups || []).find((g: any) => g.id === id);
            return g?.name || id;
          }).filter(Boolean);
          const studentNames = studentIds.map((id: string) => this.getStudentName(id)).filter(Boolean);
          // Debug log
          console.log('Task:', task, { projectIds, projectNames, classIds, classNames, groupIds, groupNames, studentIds, studentNames });
          return {
            ...task,
            projectNames,
            classNames,
            groupNames,
            studentNames
          };
        });
        this.selectedProject = null;
        this.selectedClass = null;
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
        // Map assignment names for display (multi-scope)
        this.filteredTasks = (tasks || []).map((task: any) => {
          // Collect all names for each scope
          const projectNames = (task.projectIds || task.projectId) ? ([] as string[]).concat(task.projectNames || [], project.name).filter(Boolean) : [];
          const classNames = (task.classeIds || task.classeId) ? ([] as string[]).concat(task.classNames || [], this.teacherClasses.find((c: any) => c.classId === (task.classeId || (task.classeIds?.[0])))?.className).filter(Boolean) : [];
          const groupNames = (task.groupIds || task.groupId) ? ([] as string[]).concat(task.groupNames || [], (project.groups || []).find((g: any) => g.id === (task.groupId || (task.groupIds?.[0])))?.name).filter(Boolean) : [];
          const studentNames = (task.studentIds || task.studentId) ? ([] as string[]).concat(task.studentNames || [], this.getStudentName(task.studentId || (task.studentIds?.[0]))).filter(Boolean) : [];
          return {
            ...task,
            projectNames,
            classNames,
            groupNames,
            studentNames
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
    this.repoCreationInProgress = true;
    this.repoCreationStep = 'repo';
    this.repoCreationStepMsg = 'Creating repository...';
    this.createdRepoUrl = '';
    this.teacherData.createGroup(groupPayload).subscribe({
      next: (res: Group) => {
        if (res.repoCreated) {
          this.repoCreationStep = 'invite';
          this.repoCreationStepMsg = 'Inviting members...';
          setTimeout(() => {
            this.repoCreationStep = 'branch';
            this.repoCreationStepMsg = 'Creating branches...';
            setTimeout(() => {
              this.createdRepoUrl = res.repoUrl || '';
              this.repoCreationInProgress = false;
              this.repoCreationStep = 'none';
              this.repoCreationStepMsg = '';
              this.refreshTree(this.createGroupClassId ?? undefined, this.createGroupProject.id ?? undefined);
              this.snackbar.showSuccess(`Repository for group '${this.groupNameInput}' created: ${this.createdRepoUrl}`);
              setTimeout(() => {
                this.closeCreateGroupModal();
                this.createdRepoUrl = '';
              }, 4000);
            }, 1200);
          }, 1200);
        } else {
          this.repoCreationInProgress = false;
          this.repoCreationStep = 'none';
          this.repoCreationStepMsg = '';
          this.createdRepoUrl = '';
          this.snackbar.showError(res.repoError || 'Failed to create repository.');
        }
      },
      error: (err) => {
        this.repoCreationInProgress = false;
        this.repoCreationStep = 'none';
        this.repoCreationStepMsg = '';
        this.createdRepoUrl = '';
        this.snackbar.showError('Failed to create group or repository.');
      }
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
    this.deleteRepositoryWithGroup = false; // Reset checkbox state
    this.showRemoveGroupModal = true;
  }
  closeRemoveGroupModal() {
    this.showRemoveGroupModal = false;
    this.deleteRepositoryWithGroup = false; // Reset checkbox state when closing
    this.groupToDelete = null;
  }
  removeGroupSubmit() {
    if (!this.groupToDelete) return;
    this.teacherData.deleteGroup(this.groupToDelete.id, this.deleteRepositoryWithGroup).subscribe({
      next: () => {
        this.refreshTree();
        const repoMessage = this.deleteRepositoryWithGroup ? 
          'Group and associated repository removed successfully!' : 
          'Group removed successfully! Repository remains available.';
        this.snackbar.showSuccess(repoMessage);
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
      projectIds: [],
      classIds: [],
      groupIds: [],
      studentIds: [],
      isGraded: false,
      visible: true,
      status: 'DRAFT'
    };
    // Only show unique projects for the current context
    if (this.selectedProject) {
      this.availableScopeProjects = [this.selectedProject];
    } else {
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
    // Always ensure arrays for all multi-select fields
    const projectIds = Array.isArray(this.addTaskForm.projectIds) ? this.addTaskForm.projectIds.filter(v => !!v) : [];
    const classIds = Array.isArray(this.addTaskForm.classIds) ? this.addTaskForm.classIds.filter(v => !!v) : [];
    const groupIds = Array.isArray(this.addTaskForm.groupIds) ? this.addTaskForm.groupIds.filter(v => !!v) : [];
    const studentIds = Array.isArray(this.addTaskForm.studentIds) ? this.addTaskForm.studentIds.filter(v => !!v) : [];
    // At least one selection for the chosen scope
    if (this.addTaskForm.scopeType === 'PROJECT' && projectIds.length === 0) {
      this.snackbar.showError('Select at least one project.');
      return;
    }
    if (this.addTaskForm.scopeType === 'CLASSE' && classIds.length === 0) {
      this.snackbar.showError('Select at least one class.');
      return;
    }
    if (this.addTaskForm.scopeType === 'GROUP' && groupIds.length === 0) {
      this.snackbar.showError('Select at least one group.');
      return;
    }
    if (this.addTaskForm.scopeType === 'INDIVIDUAL' && studentIds.length === 0) {
      this.snackbar.showError('Select at least one student.');
      return;
    }
    // Build payload for backend (always include arrays)
    const payload: any = {
      title: this.addTaskForm.title,
      description: this.addTaskForm.description,
      dueDate: this.addTaskForm.dueDate,
      status: this.addTaskForm.status,
      isGraded: this.addTaskForm.isGraded,
      visible: this.addTaskForm.visible,
      type: this.addTaskForm.scopeType, // <-- PATCHED: send type
      projectIds: projectIds,
      classeIds: classIds,
      groupIds: groupIds,
      studentIds: studentIds
    };
    this.teacherData.createTask(payload).subscribe({
      next: () => {
        this.reloadTasks();
        this.snackbar.showSuccess('Task(s) created successfully!');
        this.closeAddTaskModal();
      },
      error: () => this.snackbar.showError('Failed to create task(s).')
    });
  }

  // Edit Task (stub)
  editTask(task: any) {
    this.editTaskForm = {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      isGraded: task.graded, // FIX: use backend property
      visible: task.visible,
      projectIds: Array.isArray(task.projectIds) ? [...task.projectIds] : (task.projectId ? [task.projectId] : []),
      classIds: Array.isArray(task.classeIds) ? [...task.classeIds] : (task.classeId ? [task.classeId] : []),
      groupIds: Array.isArray(task.groupIds) ? [...task.groupIds] : (task.groupId ? [task.groupId] : []),
      studentIds: Array.isArray(task.studentIds) ? [...task.studentIds] : (task.studentId ? [task.studentId] : [])
    };
    this.showEditTaskModal = true;
  }
  closeEditTaskModal() {
    this.showEditTaskModal = false;
  }
  editTaskSubmit() {
    if (!this.editTaskForm.title.trim() || !this.editTaskForm.dueDate) {
      this.snackbar.showError('Title and deadline are required.');
      return;
    }
    const payload = {
      title: this.editTaskForm.title,
      description: this.editTaskForm.description,
      dueDate: this.editTaskForm.dueDate,
      status: this.editTaskForm.status,
      isGraded: this.editTaskForm.isGraded,
      visible: this.editTaskForm.visible,
      projectIds: this.editTaskForm.projectIds,
      classeIds: this.editTaskForm.classIds,
      groupIds: this.editTaskForm.groupIds,
      studentIds: this.editTaskForm.studentIds
    };
    this.teacherData.updateTask(this.editTaskForm.id, payload).subscribe({
      next: () => {
        this.reloadTasks();
        this.snackbar.showSuccess('Task updated successfully!');
        this.closeEditTaskModal();
      },
      error: () => this.snackbar.showError('Failed to update task.')
    });
  }

  onProjectCheckboxChange(event: any, id: string) {
    if (event.target.checked) {
      if (!this.addTaskForm.projectIds.includes(id)) this.addTaskForm.projectIds.push(id);
    } else {
      this.addTaskForm.projectIds = this.addTaskForm.projectIds.filter((v: string) => v !== id);
    }
  }
  onClassCheckboxChange(event: any, id: string) {
    if (event.target.checked) {
      if (!this.addTaskForm.classIds.includes(id)) this.addTaskForm.classIds.push(id);
    } else {
      this.addTaskForm.classIds = this.addTaskForm.classIds.filter((v: string) => v !== id);
    }
  }
  onGroupCheckboxChange(event: any, id: string) {
    if (event.target.checked) {
      if (!this.addTaskForm.groupIds.includes(id)) this.addTaskForm.groupIds.push(id);
    } else {
      this.addTaskForm.groupIds = this.addTaskForm.groupIds.filter((v: string) => v !== id);
    }
  }
  onStudentCheckboxChange(event: any, id: string) {
    if (event.target.checked) {
      if (!this.addTaskForm.studentIds.includes(id)) this.addTaskForm.studentIds.push(id);
    } else {
      this.addTaskForm.studentIds = this.addTaskForm.studentIds.filter((v: string) => v !== id);
    }
  }

  getStudentName(studentId: string): string {
    const student = this.studentMap[studentId];
    return student?.fullName || (student?.firstName && student?.lastName ? student.firstName + ' ' + student.lastName : student?.firstName || student?.lastName || student?.email || studentId);
  }
  getGroupContext(group: any): string {
    // Find class and project for this group
    let className = '';
    let projectName = '';
    for (const c of this.teacherClasses) {
      for (const p of c.projects) {
        if ((p.groups || []).some((g: any) => g.id === group.id)) {
          className = c.className;
          projectName = p.name;
          break;
        }
      }
    }
    return `${className}, ${projectName}`;
  }
  getStudentContext(student: any): string {
    // Find group, class, and project for this student
    let groupName = '';
    let className = '';
    let projectName = '';
    for (const c of this.teacherClasses) {
      for (const p of c.projects) {
        for (const g of (p.groups || [])) {
          if ((g.memberIds || []).includes(student.id)) {
            groupName = g.name;
            className = c.className;
            projectName = p.name;
            break;
          }
        }
      }
    }
    return `${groupName}, ${className}, ${projectName}`;
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

  // Helper to reload tasks and update filteredTasks
  reloadTasks() {
    this.teacherData.getMyTasks().subscribe(tasks => {
      this.filteredTasks = (tasks || []).map((task: any) => {
        // Collect all names for each scope (same as in ngOnInit)
        const projectIds = Array.isArray(task.projectIds) ? task.projectIds : (task.projectId ? [task.projectId] : []);
        const classIds = Array.isArray(task.classeIds) ? task.classeIds : (task.classeId ? [task.classeId] : []);
        const groupIds = Array.isArray(task.groupIds) ? task.groupIds : (task.groupId ? [task.groupId] : []);
        const studentIds = Array.isArray(task.studentIds) ? task.studentIds : (task.studentId ? [task.studentId] : []);
        const projectNames = projectIds.map((id: string) => {
          const proj = this.teacherClasses.flatMap((c: any) => c.projects).find((p: any) => p.id === id);
          return proj?.name || id;
        }).filter(Boolean);
        const classNames = classIds.map((id: string) => {
          const c = this.teacherClasses.find((c: any) => c.classId === id);
          return c?.className || id;
        }).filter(Boolean);
        const groupNames = groupIds.map((id: string) => {
          const g = this.teacherClasses.flatMap((c: any) => c.projects).flatMap((p: any) => p.groups || []).find((g: any) => g.id === id);
          return g?.name || id;
        }).filter(Boolean);
        const studentNames = studentIds.map((id: string) => this.getStudentName(id)).filter(Boolean);
        return {
          ...task,
          projectNames,
          classNames,
          groupNames,
          studentNames
        };
      });
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
    const newValue = !task.visible;
    this.teacherData.updateTaskVisibility(task.id, newValue).subscribe({
      next: (res) => {
        // Update only the toggled task's visible property using backend response
        task.visible = res.visible;
      },
      error: (err) => {
        this.snackbar.showError('Failed to update visibility.');
      }
    });
  }

  // Delete Task
  confirmDeleteTask(task: any) {
    if (confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
      this.teacherData.deleteTask(task.id).subscribe({
        next: () => {
          this.filteredTasks = this.filteredTasks.filter(t => t.id !== task.id);
          this.snackbar.showSuccess('Task deleted successfully!');
        },
        error: () => this.snackbar.showError('Failed to delete task.')
      });
    }
  }
    getTaskCountByStatus(status: string): number {
    if (!this.filteredTasks) return 0;
    return this.filteredTasks.filter(task => task.status === status).length;
  }
 
}