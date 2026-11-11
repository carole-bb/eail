# Builds the soundtrack for video-interviews.html: interview voices + ducked music bed.
# usage: python mix_interviews.py <dir with source .mov files> out.wav
import sys, subprocess, wave, os, numpy as np
src, out = sys.argv[1], sys.argv[2]
FPS=30; INTRO=90; BUMP=66; ENDN=174
CLIPS=[('0701',34.1,294),('0713',14.9,180),('0716',5.4,208),('0717',8.85,170),('0725',11.5,236),('0723',60.35,279),('0701',153.9,168)]
sr=44100; f=INTRO; pos=[]
for k,(name,ss,n) in enumerate(CLIPS):
    if k==3: f+=BUMP
    pos.append(f); f+=n
TB=INTRO/FPS; TC=(pos[2]+CLIPS[2][2])/FPS; TD=TC+BUMP/FPS; TE=f/FPS; END=TE+ENDN/FPS; N=int(END*sr)
here=os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable,os.path.join(here,'make_music.py'),out+'.music.wav','iv',str(END),str(TB),str(TC),str(TD),str(TE)],check=True)
def read(p):
    w=wave.open(p); x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float64)/32768; return x.reshape(-1,w.getnchannels())
music=read(out+'.music.wav'); music=np.pad(music,((0,max(0,N-len(music))),(0,0)))[:N]
voice=np.zeros((N,2)); duck=np.ones(N)
for (name,ss,n),f0 in zip(CLIPS,pos):
    d=n/FPS; tmp=out+'.clip.wav'
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(ss),'-t',str(d),'-i',os.path.join(src,f'IMG_{name}.mov'),'-vn','-ac','2','-ar',str(sr),
        '-af',f'highpass=f=90,loudnorm=I=-15:TP=-1.5:LRA=7,afade=t=in:d=0.04,afade=t=out:st={d-0.05}:d=0.05','-c:a','pcm_s16le',tmp],check=True)
    x=read(tmp)[:int(d*sr)]; i=int(f0/FPS*sr); voice[i:i+len(x)]+=x; duck[i:i+len(x)]=0.16; os.remove(tmp)
k=int(.3*sr); duck=np.convolve(np.pad(duck,(k,k),mode='edge'),np.ones(k)/k,mode='same')[k:-k]   # smooth the ducking
mix=voice+music*duck[:,None]*0.8; mix=np.clip(mix,-.98,.98)
w=wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((mix*32767).astype('<i2').tobytes()); w.close(); os.remove(out+'.music.wav')
print('duration',END,'frames',int(round(END*FPS)))
