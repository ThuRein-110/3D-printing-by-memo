'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useLanguage} from './settings';

const storageKey = 'memo.button-sounds';
const buttonSelector = 'button, a.button, a.choice, [role="button"], summary, input[type="submit"], input[type="reset"], input[type="button"]';

export function ButtonSounds() {
 const {t} = useLanguage();
 const [enabled, setEnabled] = useState(true);
 const preference = useRef(true);
 const player = useRef<HTMLAudioElement>(null);

 const play = useCallback(() => {
  const sound = player.current;
  if (!sound) return;
  try {
   if (sound.currentTime > 0) sound.currentTime = 0;
   void sound.play().catch(() => {});
  } catch {
   // Sound is optional on devices that do not provide an audio output.
  }
 }, []);

 useEffect(() => {
  try {
   preference.current = localStorage.getItem(storageKey) !== 'off';
   setEnabled(preference.current);
  } catch {
   // The in-memory preference also works when storage is unavailable.
  }
  function handleClick(event: MouseEvent) {
   if (!event.isTrusted || !preference.current || !(event.target instanceof Element)) return;
   const button = event.target.closest(buttonSelector);
   if (button && !button.closest(':disabled, [aria-disabled="true"], [data-sound-toggle]')) play();
  }
  document.addEventListener('click', handleClick, true);
  return () => document.removeEventListener('click', handleClick, true);
 }, [play]);

 function toggle() {
  const next = !preference.current;
  preference.current = next;
  setEnabled(next);
  try {
   localStorage.setItem(storageKey, next ? 'on' : 'off');
  } catch {
   // A blocked write does not affect the current page.
  }
  if (next) play();
  else player.current?.pause();
 }

 return (
  <>
   <audio ref={player} src="/sounds/button-click.wav" preload="auto" hidden/>
   <button type="button" data-sound-toggle="" className="choice memo-sound-toggle"
    aria-pressed={enabled} aria-label={t('brochure.clickSounds')} onClick={toggle}>
    {t('brochure.clickSounds')} <span>{t(enabled ? 'brochure.soundOn' : 'brochure.soundOff')}</span>
   </button>
  </>
 );
}
