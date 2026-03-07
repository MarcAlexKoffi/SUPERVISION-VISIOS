import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip loader for specific headers (e.g. background sync or ping)
  if (req.headers.has('X-Skip-Loading')) {
      const newReq = req.clone({ headers: req.headers.delete('X-Skip-Loading') });
      return next(newReq);
  }
  
  loadingService.show();

  return next(req).pipe(
    finalize(() => {
      loadingService.hide();
    })
  );
};
