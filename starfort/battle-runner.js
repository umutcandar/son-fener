// Small clock boundary: a hidden/closed battle never accumulates catch-up attacks.
export function createBattleRunner({advance,canRun,onPause=()=>{},now=()=>performance.now(),schedule=setInterval,cancel=clearInterval}) {
  let timer=null,running=false,lastTime=0,speed=1;
  const pause=()=>{
    if(timer!==null) cancel(timer);
    timer=null;
    const changed=running; running=false; lastTime=0;
    if(changed) onPause();
  };
  const tick=()=>{
    if(!running) return;
    if(!canRun()) { pause(); return; }
    const time=now(), delta=Math.max(0,Math.min(250,time-lastTime)); lastTime=time;
    if(delta>0) advance(delta*speed);
    if(!canRun()) pause();
  };
  return {
    get running(){return running;},
    get speed(){return speed;},
    setSpeed(value){if(value===1||value===2)speed=value;},
    resume(){if(running||!canRun())return; running=true;lastTime=now();timer=schedule(tick,100);},
    pause,
  };
}
