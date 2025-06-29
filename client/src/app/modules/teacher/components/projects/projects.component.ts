import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';

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

  constructor(private readonly teacherData: TeacherDataService) {}

  ngOnInit() {
    this.loadProjects();
    this.teacherData.getMyClassesWithCourses().subscribe(classes => {
      this.availableClasses = classes;
    });
    this.teacherData.getAllUsers().subscribe(users => {
      this.availableUsers = users;
    });
  }

  loadProjects() {
    this.teacherData.getMyProjects().subscribe(projects => {
      this.projects = projects;
    });
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
    });
  }

  updateProject() {
    if (!this.selectedProject) return;
    this.teacherData.updateProject(this.selectedProject).subscribe(() => {
      this.loadProjects();
    });
  }

  deleteProject(project: any) {
    this.teacherData.deleteProject(project.id).subscribe(() => {
      this.loadProjects();
      if (this.selectedProject?.id === project.id) this.selectedProject = null;
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
      user.email?.toLowerCase().includes(input) &&
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
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editProject = null;
  }

  saveEditProject() {
    if (!this.editProject) return;
    this.teacherData.updateProject(this.editProject).subscribe(() => {
      this.loadProjects();
      this.closeEditModal();
    });
  }
}
