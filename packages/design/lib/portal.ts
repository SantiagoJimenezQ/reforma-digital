'use client';

import { createContext } from 'react';

// La web usa body; los controles conectados al portal permanecen en su Shadow DOM.
export const PortalContainerContext = createContext<HTMLElement | undefined>(undefined);
