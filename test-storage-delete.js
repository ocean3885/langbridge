// Supabase Storage 삭제 테스트 스크립트
// 실제 파일이 존재하는지, 삭제가 되는지 확인

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testStorageDelete() {
  const testPath = 'public/8b94982b-2ba3-4e54-b700-3d7dbde0057f/1762907818697-final.mp3';
  
  console.log('1. 파일 존재 확인...');
  const { data: listData, error: listError } = await supabase.storage
    .from('kdryuls_automaking')
    .list('public/8b94982b-2ba3-4e54-b700-3d7dbde0057f');
  
  console.log('파일 목록:', listData);
  console.log('목록 에러:', listError);
  
  console.log('\n2. 파일 삭제 시도...');
  const { data: deleteData, error: deleteError } = await supabase.storage
    .from('kdryuls_automaking')
    .remove([testPath]);
  
  console.log('삭제 결과:', deleteData);
  console.log('삭제 에러:', deleteError);
  
  console.log('\n3. 삭제 후 확인...');
  const { data: afterList, error: afterError } = await supabase.storage
    .from('kdryuls_automaking')
    .list('public/8b94982b-2ba3-4e54-b700-3d7dbde0057f');
  
  console.log('삭제 후 파일 목록:', afterList);
  console.log('삭제 후 에러:', afterError);
}

testStorageDelete();
