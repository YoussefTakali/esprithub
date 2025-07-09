import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private readonly authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authToken = this.authService.getToken();
    console.log('AuthInterceptor: Token retrieved:', authToken ? authToken.substring(0, 20) + '...' : 'No token');

    if (authToken && this.shouldAddToken(req)) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`)
      });
      console.log('AuthInterceptor: Authorization header set for URL:', authReq.url);
      return next.handle(authReq);
    }

    console.log('AuthInterceptor: No token found, sending original request to:', req.url);
    return next.handle(req);
  }

  private shouldAddToken(request: HttpRequest<any>): boolean {
    const url = request.url;
    // Don't add token to login and refresh requests
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return false;
    }
    // Add token to all /api/ requests (including /api/teacher, /api/projects, etc.)
    if (url.includes('/api/')) {
      return true;
    }
    return false;
  }
}
