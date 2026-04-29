const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkMappings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { count, error } = await supabase
    .from('word_sentence_map')
    .select('*', { count: 'exact', head: true });
    
  console.log('Total mappings:', count);
  
  const { data: words, error: wordError } = await supabase
    .from('words')
    .select('id, word_sentence_map(id)')
    .limit(5);
    
  console.log('Words with mapping sample:', JSON.stringify(words, null, 2));

  const { data: sentences, error: sentenceError } = await supabase
    .from('sentences')
    .select('id, word_sentence_map(id)')
    .limit(5);
    
  console.log('Sentences with mapping sample:', JSON.stringify(sentences, null, 2));
}

checkMappings();
