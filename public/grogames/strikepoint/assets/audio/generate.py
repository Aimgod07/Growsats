"""Original layered game audio inspired by the supplied shooter reference.
No soundtrack, dialogue, or third-party game recording is embedded.
"""
from pathlib import Path
import math, random, wave, array
SR=44100
ROOT=Path(__file__).resolve().parent

def layer(out,at,duration,gain,kind,seed=1,pitch=1):
 rng=random.Random(seed);low=0;last=0;band=0;start=int(at*SR)
 for i in range(int(duration*SR)):
  t=i/SR;f=i/max(1,duration*SR);noise=rng.uniform(-1,1);low+=.09*(noise-low);high=noise-low
  if kind=='shot':
   body=math.sin(2*math.pi*(92*pitch*t-23*pitch*t*t))*math.exp(-t*37)
   crack=high*math.exp(-t*145)*1.15+low*math.exp(-t*20)*2.8
   v=(crack+body*.65)*min(1,i/8)
  elif kind=='tail':
   band+=.035*(noise-band);v=band*math.exp(-f*6)*(1-math.exp(-f*80))*2
  elif kind=='clack':
   v=(high*math.exp(-t*160)+.24*math.sin(t*2*math.pi*1450*pitch)*math.exp(-t*100)+low*math.exp(-t*50))*min(1,i/5)
  elif kind=='thunk':
   v=(low*2+math.sin(t*2*math.pi*170*pitch)*.4)*math.exp(-f*9)*min(1,i/9)
  elif kind=='slide':
   v=(high*.22+low*.8)*(math.sin(math.pi*f)**.8)*(.65+.35*math.sin(2*math.pi*t*74*pitch)**2)
  elif kind=='shell':
   v=(high*.6+math.sin(t*2*math.pi*2300*pitch)*.12)*math.exp(-f*12)*min(1,i/7)
  elif kind=='cloth':v=low*math.sin(math.pi*f)*.6
  if start+i<len(out):out[start+i]+=v*gain

def save(name,samples):
 # Smooth limiting and a short final fade prevent clicks while preserving the transient.
 peak=max(abs(x) for x in samples) or 1
 factor=min(1,.92/peak)
 for i in range(min(400,len(samples))):samples[-1-i]*=i/400
 data=array.array('h',(int(max(-.98,min(.98,x*factor))*32767) for x in samples))
 with wave.open(str(ROOT/name),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(data.tobytes())

for gun,length,pitch,gain in [('rifle',.44,1.05,1),('smg',.28,1.48,.84),('shotgun',.66,.68,1.2),('marksman',.75,.83,1.12)]:
 a=[0.]*int(length*SR)
 layer(a,0,min(length,.3),gain,'shot',17,pitch)
 layer(a,.017,.055,.27,'clack',23,pitch)
 layer(a,.036,length-.036,.55,'tail',61,pitch)
 for n,delay in enumerate([.053,.087,.137]):layer(a,delay,min(.18,length-delay),.14/(n+1),'shot',17,pitch)
 if gun=='shotgun':
  layer(a,.18,.16,.35,'slide',39);layer(a,.34,.07,.43,'clack',72,.75)
 if gun=='marksman':layer(a,.30,.16,.26,'slide',19,.78);layer(a,.48,.07,.30,'clack',51,.85)
 save(gun+'-fire.wav',a)

sequences={
'rifle':(1.8,[(.04,.06,.50,'clack'),(.16,.20,.25,'cloth'),(.32,.09,.50,'thunk'),(.78,.18,.22,'slide'),(1.04,.10,.64,'thunk'),(1.30,.06,.30,'clack'),(1.47,.14,.46,'slide'),(1.65,.10,.55,'clack')]),
'smg':(1.45,[(.03,.05,.55,'clack'),(.14,.12,.25,'slide'),(.28,.08,.32,'clack'),(.60,.18,.18,'cloth'),(.87,.08,.55,'thunk'),(1.08,.12,.34,'slide'),(1.28,.08,.55,'clack')]),
'shotgun':(2.35,[(.05,.12,.28,'cloth'),(.27,.11,.48,'shell'),(.42,.07,.25,'clack'),(.66,.11,.46,'shell'),(.81,.07,.25,'clack'),(1.05,.11,.48,'shell'),(1.20,.07,.25,'clack'),(1.44,.11,.48,'shell'),(1.79,.17,.53,'slide'),(2.02,.13,.65,'thunk'),(2.19,.07,.33,'clack')]),
'marksman':(2.2,[(.06,.09,.44,'clack'),(.24,.23,.32,'slide'),(.50,.11,.43,'thunk'),(.85,.23,.20,'cloth'),(1.20,.13,.60,'thunk'),(1.60,.19,.43,'slide'),(1.94,.14,.57,'clack')])}
for g,(duration,sequence) in sequences.items():
 a=[0.]*int(duration*SR)
 for j,(time,length,volume,kind) in enumerate(sequence):layer(a,time,length,volume,kind,100+j,{'rifle':1,'smg':1.4,'shotgun':.8,'marksman':.7}[g])
 save(g+'-reload.wav',a)
print('8 distinct local weapon clips generated (44.1kHz PCM).')
