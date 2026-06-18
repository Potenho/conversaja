import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/entrada/entrada').then((m) => m.Entrada),
  },
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lobby/lobby').then((m) => m.Lobby),
  },
  {
    path: 'sala/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/sala/sala').then((m) => m.Sala),
  },
  { path: '**', redirectTo: '' },
];
