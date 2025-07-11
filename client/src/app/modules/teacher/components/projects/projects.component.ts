import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-teacher-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class TeacherProjectsComponent implements OnInit {
  projects: any[] = [];
  selectedProject: any = null;
  availableClasses: any[] = [];
  availableUsers: any[] = [];
  newProject: any = { name: '', description: '', deadline: '', classIds: [], collaboratorIds: [] };
  collaborators: any[] = [];
  collaboratorEmail: string = '';
  showCreateModal = false;
  filteredCollaborators: any[] = [];
  showDetailsModal = false;
  showEditModal = false;
  detailsProject: any = null;
  editProject: any = null;
  editCollaboratorEmail: string = '';
  filteredEditCollaborators: any[] = [];
  hoveredCollaborator: any = null;
  showDeleteDialog: boolean = false;
  projectToDelete: any = null;
  searchTerm: string = '';
  loading: boolean = false;
  error: string | null = null;
  filteredProjects: any[] = [];

  constructor(private readonly teacherData: TeacherDataService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loading = true;
    this.error = null;
    this.loadProjects();
    this.teacherData.getMyClassesWithCourses().subscribe(classes => {
      this.availableClasses = classes;
    });
    // Enable fetching all users for collaborator suggestions
    // Use summary endpoint for user suggestions (id, name, email)
    this.teacherData.getAllUserSummaries().subscribe(users => {
      this.availableUsers = users;
    });
    this.filterProjects();
  }

  loadProjects() {
    this.loading = true;
    this.error = null;
    this.teacherData.getMyProjects().subscribe({
      next: projects => {
        this.projects = projects;
        this.filterProjects();
        this.loading = false;
      },
      error: err => {
        this.error = 'Failed to load projects.';
        this.loading = false;
      }
    });
  }

  filterProjects() {
    const term = this.searchTerm.toLowerCase();
    this.filteredProjects = this.projects.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    );
  }

  getDaysUntilDeadline(deadline: string): number {
    if (!deadline) return 0;
    const due = new Date(deadline).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  }

  selectProject(project: any) {
    this.selectedProject = project;
    this.collaborators = project.collaborators ?? [];
  }

  openCreateModal() {
    this.showCreateModal = true;
    this.newProject = { name: '', description: '', deadline: '', classIds: [], collaboratorIds: [] };
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createProject() {
    const payload = {
      name: this.newProject.name,
      description: this.newProject.description,
      deadline: this.newProject.deadline,
      classIds: this.newProject.classIds,
      collaboratorIds: this.newProject.collaboratorIds
    };
    this.teacherData.createProject(payload).subscribe(() => {
      this.loadProjects();
      this.closeCreateModal();
      this.snackBar.open('Project created successfully!', 'Close', { duration: 3000 });
    });
  }

  updateProject() {
    if (!this.selectedProject) return;
    const payload = {
      id: this.selectedProject.id,
      name: this.selectedProject.name,
      description: this.selectedProject.description,
      deadline: this.selectedProject.deadline,
      classIds: this.selectedProject.classIds ?? (this.selectedProject.classes ? this.selectedProject.classes.map((c: any) => c.id ?? c.classId) : []),
      collaboratorIds: this.selectedProject.collaboratorIds ?? (this.selectedProject.collaborators ? this.selectedProject.collaborators.map((u: any) => u.id) : [])
    };
    this.teacherData.updateProject(payload).subscribe(() => {
      this.loadProjects();
      this.snackBar.open('Project updated successfully!', 'Close', { duration: 3000 });
    });
  }

  confirmDeleteProject(project: any) {
    this.projectToDelete = project;
    this.showDeleteDialog = true;
  }

  cancelDeleteProject() {
    this.showDeleteDialog = false;
    this.projectToDelete = null;
  }

  deleteProjectConfirmed() {
    if (!this.projectToDelete) return;
    this.teacherData.deleteProject(this.projectToDelete.id).subscribe(() => {
      this.loadProjects();
      if (this.selectedProject?.id === this.projectToDelete.id) this.selectedProject = null;
      this.snackBar.open('Project deleted successfully!', 'Close', { duration: 3000 });
      this.showDeleteDialog = false;
      this.projectToDelete = null;
    });
  }

  addCollaborator() {
    if (!this.selectedProject || !this.collaboratorEmail) return;
    this.teacherData.addCollaborator(this.selectedProject.id, this.collaboratorEmail).subscribe(() => {
      this.loadProjects();
      this.collaboratorEmail = '';
    });
  }

  removeCollaborator(userId: string) {
    if (!this.selectedProject) return;
    this.teacherData.removeCollaborator(this.selectedProject.id, userId).subscribe(() => {
      this.loadProjects();
    });
  }

  onCollaboratorInput() {
    const input = this.collaboratorEmail.toLowerCase();
    this.filteredCollaborators = this.availableUsers.filter(user =>
      (user.email?.toLowerCase().includes(input) || user.firstName?.toLowerCase().includes(input) || user.lastName?.toLowerCase().includes(input)) &&
      !this.newProject.collaboratorIds.includes(user.id)
    ).slice(0, 5); // limit suggestions
  }

  selectCollaborator(user: any) {
    if (!this.newProject.collaboratorIds.includes(user.id)) {
      this.newProject.collaboratorIds.push(user.id);
    }
    this.collaboratorEmail = '';
    this.filteredCollaborators = [];
  }

  removeNewCollaborator(id: string) {
    this.newProject.collaboratorIds = this.newProject.collaboratorIds.filter((uid: string) => uid !== id);
  }

  getUserEmailById(id: string): string {
    const user = this.availableUsers.find(u => u.id === id);
    return user ? user.email : id;
  }

  openDetailsModal(project: any, event?: Event) {
    if (event) event.stopPropagation();
    this.detailsProject = project;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.detailsProject = null;
  }

  openEditModal(project: any, event?: Event) {
    if (event) event.stopPropagation();
    this.editProject = { ...project };
    // Ensure classIds and collaboratorIds are arrays of IDs
    this.editProject.classIds = project.classIds ?? (project.classes ? project.classes.map((c: any) => c.id ?? c.classId) : []);
    this.editProject.collaboratorIds = project.collaboratorIds ?? (project.collaborators ? project.collaborators.map((u: any) => u.id) : []);
    this.editCollaboratorEmail = '';
    this.filteredEditCollaborators = [];
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editProject = null;
  }

  saveEditProject() {
    if (!this.editProject) return;
    const payload = {
      id: this.editProject.id,
      name: this.editProject.name,
      description: this.editProject.description,
      deadline: this.editProject.deadline,
      classIds: this.editProject.classIds ?? (this.editProject.classes ? this.editProject.classes.map((c: any) => c.id ?? c.classId) : []),
      collaboratorIds: this.editProject.collaboratorIds ?? (this.editProject.collaborators ? this.editProject.collaborators.map((u: any) => u.id) : [])
    };
    this.teacherData.updateProject(payload).subscribe(() => {
      this.loadProjects();
      this.closeEditModal();
      this.snackBar.open('Project updated successfully!', 'Close', { duration: 3000 });
    });
  }

  onEditCollaboratorInput() {
    const input = this.editCollaboratorEmail.toLowerCase();
    this.filteredEditCollaborators = this.availableUsers.filter(user =>
      (user.email?.toLowerCase().includes(input) || user.firstName?.toLowerCase().includes(input) || user.lastName?.toLowerCase().includes(input)) &&
      !this.editProject.collaboratorIds.includes(user.id)
    ).slice(0, 5);
  }

  selectEditCollaborator(user: any) {
    if (!this.editProject.collaboratorIds.includes(user.id)) {
      this.editProject.collaboratorIds.push(user.id);
    }
    this.editCollaboratorEmail = '';
    this.filteredEditCollaborators = [];
  }

  removeEditCollaborator(id: string) {
    this.editProject.collaboratorIds = this.editProject.collaboratorIds.filter((uid: string) => uid !== id);
  }

  getClassNameById(classId: string): string {
    const found = this.availableClasses.find(c => c.classId === classId);
    if (found) {
      // Show both class name and course name if available
      return found.className + (found.courseName ? ` (${found.courseName})` : '');
    }
    return classId;
  }
}
