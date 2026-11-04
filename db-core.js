/* voCat v86 editor: preserve unknown columns and all non-Corpus records. */
(function(root){
'use strict';
class VocatDB {
 constructor(SQL,bytes){this.db=new SQL.Database(bytes);try{this.validate();}catch(e){this.db.close();throw e;}this.lastTime=0n;const random=new Uint8Array(8);crypto.getRandomValues(random);random[0]|=1;this.node=Array.from(random.slice(0,6),b=>b.toString(16).padStart(2,'0')).join('');this.clock=(((random[6]<<8)|random[7])&0x3fff)|0x8000;}
 rows(sql,params=[]){const stmt=this.db.prepare(sql);try{stmt.bind(params);const out=[];while(stmt.step())out.push(stmt.getAsObject());return out;}finally{stmt.free();}}
 validate(){if(this.rows('PRAGMA quick_check')[0]?.quick_check!=='ok')throw Error('DB 무결성 검사에 실패했습니다.');for(const [table,required] of Object.entries({Corpus:['id','vocabularyId','word','meaning','familiar','isDeleted','scheduledAt','updatedAt','createdAt'],Vocabulary:['id','name','total','isDeleted','updatedAt']})){const cols=this.rows('PRAGMA table_info("'+table+'")');if(!required.every(k=>cols.some(c=>c.name===k)))throw Error('지원하는 voCat DB 구조가 아닙니다: '+table);if(table==='Corpus'){const supplied=['id','vocabularyId','word','meaning','scheduledAt','updatedAt','createdAt'];if(cols.some(c=>c.notnull&&c.dflt_value===null&&!supplied.includes(c.name)))throw Error('추가 필수 필드가 있는 DB는 지원하지 않습니다.');}}if(this.rows('SELECT id FROM Corpus GROUP BY id HAVING COUNT(*)>1').length)throw Error('중복 ID가 있습니다.');}
 books(){return this.rows('SELECT id,name FROM Vocabulary WHERE COALESCE(isDeleted,0)=0 ORDER BY name');}
 words(book){return this.rows('SELECT id,word,meaning FROM Corpus WHERE vocabularyId=? AND COALESCE(isDeleted,0)=0 ORDER BY createdAt DESC,id',[book]);}
 newId(){let t=BigInt(Date.now())*10000n+122192928000000000n;if(t<=this.lastTime)t=this.lastTime+1n;this.lastTime=t;const low=(t&0xffffffffn).toString(16).padStart(8,'0');const mid=((t>>32n)&0xffffn).toString(16).padStart(4,'0');const hi=(((t>>48n)&0xfffn)|0x1000n).toString(16).padStart(4,'0');return `${hi}-${mid}-${low}-${this.clock.toString(16)}-${this.node}`;}
 save({id,book,word,meaning}){word=word.trim();meaning=meaning.trim();if(!word||!meaning||word.length>200||meaning.length>2000)throw Error('단어(200자 이하)와 뜻(2,000자 이하)을 입력하세요.');if(!this.books().some(x=>x.id===book))throw Error('단어장을 선택하세요.');const now=new Date().toISOString().replace('T',' ');this.db.run('BEGIN');try{if(id){this.db.run('UPDATE Corpus SET word=?,meaning=?,updatedAt=? WHERE id=? AND vocabularyId=? AND COALESCE(isDeleted,0)=0',[word,meaning,now,id,book]);if(this.db.getRowsModified()!==1)throw Error('수정할 단어를 찾지 못했습니다.');}else{id=this.newId();this.db.run('INSERT INTO Corpus(id,vocabularyId,word,meaning,scheduledAt,updatedAt,createdAt) VALUES(?,?,?,?,?,?,?)',[id,book,word,meaning,now,now,now]);}this.db.run('UPDATE Vocabulary SET total=(SELECT COUNT(*) FROM Corpus WHERE vocabularyId=? AND COALESCE(isDeleted,0)=0),updatedAt=? WHERE id=?',[book,now,book]);this.db.run('COMMIT');return id;}catch(e){this.db.run('ROLLBACK');throw e;}}
 setDeleted(id,book,deleted=true){
 const now=new Date().toISOString().replace('T',' ');
 if(!this.books().some(x=>x.id===book))throw Error('단어장을 찾지 못했습니다.');
 this.db.run('BEGIN');
 try{
  this.db.run('UPDATE Corpus SET isDeleted=?,updatedAt=? WHERE id=? AND vocabularyId=? AND COALESCE(isDeleted,0)=?',[deleted?1:0,now,id,book,deleted?0:1]);
  if(this.db.getRowsModified()!==1)throw Error('단어를 찾지 못했거나 이미 처리했습니다.');
  this.db.run('UPDATE Vocabulary SET total=(SELECT COUNT(*) FROM Corpus WHERE vocabularyId=? AND COALESCE(isDeleted,0)=0),updatedAt=? WHERE id=?',[book,now,book]);
  this.db.run('COMMIT');
 }catch(e){this.db.run('ROLLBACK');throw e;}
 }
 export(){this.validate();return this.db.export();}
 close(){this.db.close();}
}
root.VocatDB=VocatDB;if(typeof module!=='undefined')module.exports=VocatDB;
})(typeof window!=='undefined'?window:globalThis);
