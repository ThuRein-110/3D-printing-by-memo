import {it,expect} from 'vitest';
import {canTransition} from '@mfu/types';
it('enforces legal state transitions by actor',()=>{expect(canTransition('submitted','paid_deposit','admin')).toBe(false);expect(canTransition('printing','finishing','customer')).toBe(false);expect(canTransition('awaiting_customer_approval','approved','customer')).toBe(true);expect(canTransition('completed','printing','admin')).toBe(false);expect(canTransition('shipped','completed','customer')).toBe(true);});
