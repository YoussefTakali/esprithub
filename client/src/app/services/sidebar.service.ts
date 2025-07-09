import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarVisible = new BehaviorSubject<boolean>(false);
  sidebarVisible$ = this.sidebarVisible.asObservable();

  toggleSidebar(isVisible: boolean) {
    this.sidebarVisible.next(isVisible);
  }

  closeSidebar() {
    this.sidebarVisible.next(false);
  }

  openSidebar() {
    this.sidebarVisible.next(true);
  }
}
