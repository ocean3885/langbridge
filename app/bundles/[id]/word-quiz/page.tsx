import BundleWordPracticePage, { type BundleWordPracticePageProps } from '../_components/BundleWordPracticePage';

export default function Page(props: BundleWordPracticePageProps) {
  return <BundleWordPracticePage {...props} practiceMode="word_quiz" />;
}
