import { describe, expect, it } from 'vitest';
import { Coach } from './coach';
import type { SoundName } from './sounds';

function makeCoach() {
  const said: string[] = [];
  const played: SoundName[] = [];
  const coach = new Coach({ say: (text) => said.push(text) }, { play: (name) => played.push(name) });
  return { coach, said, played };
}

describe('Coach', () => {
  it('засчитанное повторение — сигнал и номер', () => {
    const { coach, said, played } = makeCoach();
    coach.handle([{ type: 'rep', counted: true, number: 7, hint: 'Засчитано' }], 0);
    expect(played).toEqual(['success']);
    expect(said).toEqual(['7']);
  });

  it('незасчитанное — другой сигнал и причина', () => {
    const { coach, said, played } = makeCoach();
    coach.handle([{ type: 'rep', counted: false, number: 3, hint: 'Глубже!' }], 0);
    expect(played).toEqual(['fail']);
    expect(said).toEqual(['Глубже!']);
  });

  it('одна подсказка — не чаще раза в 3 секунды', () => {
    const { coach, said } = makeCoach();
    coach.handle([{ type: 'hint', text: 'Таз провис' }], 0);
    coach.handle([{ type: 'hint', text: 'Таз провис' }], 2000);
    coach.handle([{ type: 'hint', text: 'Колени' }], 2500);
    coach.handle([{ type: 'hint', text: 'Таз провис' }], 3100);
    expect(said).toEqual(['Таз провис', 'Колени', 'Таз провис']);
  });

  it('сигнал о незасчитанном звучит всегда, даже если причина не озвучена', () => {
    const { coach, said, played } = makeCoach();
    coach.handle([{ type: 'rep', counted: false, number: 0, hint: 'Глубже!' }], 0);
    coach.handle([{ type: 'rep', counted: false, number: 0, hint: 'Глубже!' }], 1000);
    expect(played).toEqual(['fail', 'fail']);
    expect(said).toEqual(['Глубже!']);
  });

  it('события одного кадра — одной фразой', () => {
    const { coach, said, played } = makeCoach();
    coach.handle(
      [
        { type: 'rep', counted: true, number: 10, hint: 'Засчитано' },
        { type: 'finished', success: true, text: 'Готово!' },
      ],
      0,
    );
    expect(said).toEqual(['10. Готово!']);
    expect(played).toEqual(['success', 'finish']);
  });

  it('планка: каждые 10 секунд', () => {
    const { coach, said } = makeCoach();
    coach.handle([{ type: 'seconds', seconds: 20 }], 0);
    expect(said).toEqual(['20 секунд']);
  });
});
