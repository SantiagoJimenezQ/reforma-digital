import type { ApiRd } from '../shared/api';

declare global {
  interface Window {
    rd: ApiRd;
  }
}
