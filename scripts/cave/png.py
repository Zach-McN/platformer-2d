# generatedBy: claude-fable-5-1, generatedAt: 2026-09-01
#
# Minimal PNG reader/writer (RGBA, one IDAT, correct checksums — see game-content TG2).
# Run from the game folder:  python scripts/cave/png.py
# Pure Python 3, no packages. Every file written carries a generatedBy marker.
import zlib, struct
def read(path):
    d=open(path,'rb').read(); assert d[:8]==b'\x89PNG\r\n\x1a\n'
    p=8; idat=b''; w=h=0; ct=0
    while p<len(d):
        n=struct.unpack('>I',d[p:p+4])[0]; t=d[p+4:p+8]; c=d[p+8:p+8+n]; p+=12+n
        if t==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',c[:10])
        elif t==b'IDAT': idat+=c
    raw=zlib.decompress(idat); bpp={6:4,2:3,0:1,4:2}[ct]; stride=w*bpp
    rows=[]; prev=bytearray(stride); q=0
    for y in range(h):
        f=raw[q]; q+=1; line=bytearray(raw[q:q+stride]); q+=stride
        for i in range(stride):
            a=line[i-bpp] if i>=bpp else 0; b=prev[i]; c=prev[i-bpp] if i>=bpp else 0
            if f==1: line[i]=(line[i]+a)&255
            elif f==2: line[i]=(line[i]+b)&255
            elif f==3: line[i]=(line[i]+(a+b)//2)&255
            elif f==4:
                pa=abs(b-c); pb=abs(a-c); pc=abs(a+b-2*c)
                pr=a if pa<=pb and pa<=pc else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        rows.append(line); prev=line
    px=[]
    for line in rows:
        r=[]
        for x in range(w):
            v=line[x*bpp:(x+1)*bpp]
            if bpp==4: r.append(tuple(v))
            elif bpp==3: r.append((v[0],v[1],v[2],255))
            elif bpp==2: r.append((v[0],v[0],v[0],v[1]))
            else: r.append((v[0],v[0],v[0],255))
        px.append(r)
    return w,h,px
def write(path,px):
    h=len(px); w=len(px[0])
    raw=b''.join(b'\x00'+bytes(c for p in row for c in p) for row in px)
    def ch(t,c): return struct.pack('>I',len(c))+t+c+struct.pack('>I',zlib.crc32(t+c)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b''))
