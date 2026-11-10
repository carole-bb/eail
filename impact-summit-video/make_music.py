# Synthesises an original 40 s music bed (C-G-Am-F, 100 BPM) timed to the cuts in video.html.
import numpy as np, wave, sys
sr=44100; BEAT=.6; BAR=2.4; DUR=40.0; N=int(sr*DUR); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(3)
def put(sig,t,g=1.0,pan=0.0):
    i=int(t*sr); n=min(len(sig),N-i)
    if n<=0: return
    L[i:i+n]+=sig[:n]*g*(1-max(0,pan)); R[i:i+n]+=sig[:n]*g*(1+min(0,pan))
def tone(f,d,harm=(1,.5,.25,.12),dec=None,att=.005):
    t=np.arange(int(d*sr))/sr; s=sum(a*np.sin(2*np.pi*f*(k+1)*t) for k,a in enumerate(harm))
    env=np.minimum(1,t/att)*(np.exp(-t*dec) if dec else np.minimum(1,(d-t)/.6)); return s*env
def kick(g=1.0):
    t=np.arange(int(.35*sr))/sr; f=45+90*np.exp(-t*28); return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*9)*g
def hat():
    t=np.arange(int(.05*sr))/sr; n=rng.standard_normal(len(t)); n=np.diff(n,prepend=0); return n*np.exp(-t*90)
note=lambda m:440*2**((m-69)/12)
CH=[[48,55,60,64,67],[43,55,59,62,67],[45,57,60,64,69],[41,53,57,60,65]]  # C G Am F
TB,TC,TD,TE=7.2,12,21.6,28.8
nb=int(np.ceil(DUR/BAR))
for b in range(nb):
    t0=b*BAR; ch=CH[b%4]; end=t0>=36
    if end: ch=CH[0]
    # pad
    for m in ch[1:]:
        put(tone(note(m),BAR+1.2 if not end else 4.0,harm=(1,.35,.18,.08,.04),att=.5),t0,.045,pan=rng.uniform(-.4,.4))
    if end and t0>36: continue
    sec='A' if t0<TB else 'B' if t0<TC else 'C' if t0<TD else 'D' if t0<TE else 'E'
    for k in range(8):                       # eighth notes
        t=t0+k*BEAT/2
        if t>=DUR-3: break
        if sec in 'BCE' or (sec=='D' and k%2==0):
            m=ch[1:][[0,2,1,3,2,3,1,2][k]]+12
            put(tone(note(m),.5,dec=7),t,.10 if sec!='B' else .07,pan=.35*(-1)**k)
        if sec in 'CE' and k%2==1: put(hat(),t,.035)
        if k%2==0:
            if sec in 'CE': put(kick(),t,.55); put(tone(note(ch[0]-12),.5,harm=(1,.3),dec=5),t,.28)
            elif sec=='B' and k%4==0: put(kick(.7),t,.4); put(tone(note(ch[0]-12),1.0,harm=(1,.3),dec=3),t,.22)
# opening: one soft thud + note per problem block, then a bigger hit on the punchline
for n in range(5):
    t=.6+n*.6; put(kick(.8),t,.45); put(tone(note([60,62,64,67,69][n]),.9,dec=5),t,.16)
put(kick(),4.2,.7); put(tone(note(36),2.0,harm=(1,.4),dec=1.5),4.2,.3); put(tone(note(72),1.5,dec=3),4.2,.16)
# risers into the cuts, impact on the end card
def riser(d):
    t=np.arange(int(d*sr))/sr; n=rng.standard_normal(len(t)); n=np.diff(n,prepend=0); return n*(t/d)**3
for T,g in [(TB,.05),(TC,.06),(TE,.12)]: put(riser(1.2),T-1.2,g)
put(kick(),TE,.8); put(tone(note(36),3.0,harm=(1,.4),dec=1.0),TE,.35)
# simple reverb + master
ir=rng.standard_normal(int(1.6*sr))*np.exp(-np.arange(int(1.6*sr))/sr*4.5)
def rev(x): n=len(x)+len(ir); return np.fft.irfft(np.fft.rfft(x,n)*np.fft.rfft(ir,n),n)[:len(x)]*.012
L2=L+rev(R)*.9; R2=R+rev(L)*.9
t=np.arange(N)/sr; fade=np.minimum(1,t/.05)*np.clip((DUR-t)/3.5,0,1)
st=np.stack([L2,R2],1)*fade[:,None]; st=np.tanh(st*1.6/np.abs(st).max()*1.2)*.89
w=wave.open(sys.argv[1] if len(sys.argv)>1 else 'music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
