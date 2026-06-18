import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Impede o acesso ao lobby/salas sem apelido definido; redireciona à entrada. */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return session.autenticado() ? true : router.createUrlTree(['/']);
};
