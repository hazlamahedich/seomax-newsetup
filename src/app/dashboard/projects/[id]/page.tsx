"use client";

import React from 'react';
import ProjectUI from './ProjectUI';
import ProjectDetails from "@/components/projects/ProjectDetails";

export default function ProjectPage() {
  return (
    <ProjectUI>
      <ProjectDetails project={null} />
    </ProjectUI>
  );
} 