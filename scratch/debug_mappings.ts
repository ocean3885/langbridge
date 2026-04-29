import { createAdminClient } from './lib/supabase/admin';

async function checkMappings() {
  const supabase = createAdminClient();
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
