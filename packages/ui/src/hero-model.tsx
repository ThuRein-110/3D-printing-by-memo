'use client';

import dynamic from 'next/dynamic';
import {Component, useCallback, useId, useState, type ReactNode} from 'react';
import {useLanguage} from './settings';

const HeroScene = dynamic(() => import('@mfu/three/HeroScene.tsx'), {ssr: false});

class HeroModelBoundary extends Component<{
 children: ReactNode;
 onUnavailable: () => void;
}, {failed: boolean}> {
 state = {failed: false};
 static getDerivedStateFromError() { return {failed: true}; }
 componentDidCatch() { this.props.onUnavailable(); }
 render() { return this.state.failed ? null : this.props.children; }
}

export function HeroModel() {
 const {t} = useLanguage();
 const instructionsId = useId();
 const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
 const ready = useCallback(() => setStatus('ready'), []);
 const unavailable = useCallback(() => setStatus('unavailable'), []);
 const label = t('brochure.model');

 return (
  <figure className="brochure-hero-model" aria-label={label} data-model-state={status}>
   <div className="brochure-hero-art">
    {status !== 'ready' && (
     <img src="/brand/hero-figurine-hd.webp" width={1080} height={1080}
      alt={status === 'unavailable' ? label : ''} fetchPriority="high"/>
    )}
    {status !== 'unavailable' && (
     <div className="brochure-hero-render" inert={status !== 'ready'}>
      <HeroModelBoundary onUnavailable={unavailable}>
       <HeroScene
        label={label}
        instructionsId={instructionsId}
        onReady={ready}
        onUnavailable={unavailable}
       />
      </HeroModelBoundary>
     </div>
    )}
   </div>
   <figcaption className="brochure-hero-caption" id={instructionsId}>
    {t(status === 'ready' ? 'brochure.modelControls' : status === 'unavailable' ? 'brochure.modelUnavailable' : 'common.loading')}
   </figcaption>
  </figure>
 );
}
