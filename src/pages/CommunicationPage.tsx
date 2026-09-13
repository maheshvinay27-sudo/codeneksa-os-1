import React from 'react';
import { WelcomeMailPage } from './WelcomeMailPage';

interface CommunicationPageProps {
  onNavigateToStudent?: (studentId: string) => void;
}

export const CommunicationPage: React.FC<CommunicationPageProps> = ({
  onNavigateToStudent,
}) => {
  return <WelcomeMailPage onNavigateToStudent={onNavigateToStudent} />;
};
