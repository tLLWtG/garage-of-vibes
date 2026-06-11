import type { MilestoneDef } from './types';

export const MILESTONES: MilestoneDef[] = [
  {
    id: 'first_run',
    name: '初次收成',
    desc: '完成一次下潜并活着回来',
    reward: 6,
  },
  {
    id: 'first_ignite',
    name: '玩火者',
    desc: '让火帽点燃一间铜芽巢室',
    reward: 6,
  },
  {
    id: 'deep4',
    name: '深耕者',
    desc: '抵达深度 ≥ 4 的房间',
    reward: 10,
  },
  {
    id: 'perfect',
    name: '完美收割',
    desc: '清空一座地牢的所有房间后撤离',
    reward: 12,
  },
  {
    id: 'rich',
    name: '丰饶之季',
    desc: '单次下潜带回 ≥ 40 精华',
    reward: 12,
  },
  {
    id: 'all_plots',
    name: '开垦到边界',
    desc: '解锁全部 25 块田地',
    reward: 20,
  },
  {
    id: 'first_hybrid',
    name: '初次杂交',
    desc: '让两株满成熟的相邻作物发生杂交反应',
    reward: 10,
  },
  {
    id: 'event_first',
    name: '雾中来客',
    desc: '在迷雾铃堂中经历一桩际遇',
    reward: 6,
  },
  {
    id: 'boss_slain',
    name: '屠王者',
    desc: '击败根须霸主',
    reward: 20,
  },
  {
    id: 'curse_clear',
    name: '玩火自焚',
    desc: '活着清剿一间灾厄窟',
    reward: 8,
  },
  {
    id: 'worldheart_slain',
    name: '大地之心',
    desc: '种出并战胜大地之心，完成通关',
    reward: 30,
  },
];

export const milestoneById = (id: string) =>
  MILESTONES.find((m) => m.id === id);
