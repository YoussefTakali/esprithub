export interface Group {
  id: string;
  name: string;
  projectId: string;
  classeId: string;
  studentIds: string[];
  repoCreated?: boolean;
  repoUrl?: string;
  repoError?: string;
  repositoryId?: string;
  repositoryFullName?: string;
  repositoryName?: string;
  repositoryCloneUrl?: string;
  hasRepository?: boolean;
}
