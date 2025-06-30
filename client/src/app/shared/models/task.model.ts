export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  visible: boolean;
  [key: string]: any;
}
