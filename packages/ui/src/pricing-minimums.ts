'use client';
import {useResource} from './common';
export function usePricingMinimums(){return useResource<{data:{basicMinimum:number;customMinimum:number}}>('/public/pricing-minimums').data?.data??{basicMinimum:100,customMinimum:1500};}
