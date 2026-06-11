import type { EventDef, EventId } from './types';

export const EVENTS: Record<EventId, EventDef> = {
  well: {
    id: 'well',
    title: '低语井',
    desc: '井底传来翻动钱币的窸窣声。投入 10 精华，它许诺「翻倍奉还」——也可能一口吞掉。',
    accept: '投入 10 精华（50% 翻倍 / 50% 吞没）',
    decline: '捂紧口袋离开',
  },
  bloodvine: {
    id: 'bloodvine',
    title: '嗜血藤',
    desc: '一株藤蔓亮出尖刺，叶片间裹着一颗陌生的种子。它想要的报酬很直接：你的血。',
    accept: '献出 6 生命，取走那颗种子',
    decline: '退后离开',
  },
  stele: {
    id: 'stele',
    title: '古碑',
    desc: '半埋的石碑刻着两面铭文：一面是「锋」，一面是「愈」。手掌按上去的那面会苏醒。',
    accept: '按下「锋」：本次下潜攻击 +1',
    decline: '按下「愈」：回复 8 生命',
  },
  ghostTrader: {
    id: 'ghostTrader',
    title: '幽灵商人',
    desc: '半透明的身影掂着布袋：「高级货色，6 精华，概不退换。」袋中影影绰绰是火帽、荆棘或心藤。',
    accept: '付 6 精华，买下袋中种子',
    decline: '摇头走开',
  },
  collapse: {
    id: 'collapse',
    title: '塌方的矿脉',
    desc: '塌落的岩堆里嵌着大块精华矿，摇摇欲坠。踢一脚也许能震下来——也会砸到你。',
    accept: '狠踢一脚（受 2 伤，获得 8-14 精华）',
    decline: '绕开碎石离开',
  },
};

export const EVENT_IDS: EventId[] = Object.keys(EVENTS) as EventId[];
