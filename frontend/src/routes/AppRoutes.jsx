import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import AppLayout from '../components/layout/AppLayout';

// Auth Pages
import Login from '../pages/auth/Login';
import ChangePassword from '../pages/auth/ChangePassword';
import Profile from '../pages/auth/Profile';

// Dashboards
import StudentDashboard from '../pages/student/Dashboard';
import TeacherDashboard from '../pages/teacher/Dashboard';
import AdminDashboard from '../pages/admin/Dashboard';

// Teacher Pages
import CreateDynamicLesson from '../pages/teacher/CreateDynamicLesson';
import QuizBuilder from '../pages/teacher/QuizBuilder';
import UploadMaterial from '../pages/teacher/UploadMaterial';
import MajorCurriculum from '../pages/teacher/MajorCurriculum';

// Student Pages
import QuizzesAndResults from '../pages/student/QuizzesAndResults';
import QuizTaking from '../pages/student/QuizTaking';

// Shared / Admin Pages
import MaterialDetail from '../pages/materials/MaterialDetail';
import MaterialModeration from '../pages/admin/MaterialModeration';
import UserManagement from '../pages/admin/UserManagement';
import ReportManagement from '../pages/admin/ReportManagement';
import CurriculumManagement from '../pages/admin/CurriculumManagement';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route (No Header/Footer) */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        {/* Global Layout Wrapper (Header + Footer + Main Container) */}
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Shared Material Details */}
          <Route path="/materials/:materialId" element={<MaterialDetail />} />
          <Route path="/materials/mine/:materialId" element={<MaterialDetail />} />

          {/* Student Routes */}
          <Route element={<RoleRoute allowedRoles={['student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/quizzes" element={<QuizzesAndResults />} />
            {/* Updated :materialId to :lessonId */}
            <Route path="/student/quiz/:lessonId" element={<QuizTaking />} />
          </Route>

          {/* Teacher Routes */}
          <Route element={<RoleRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/majors/:majorId" element={<MajorCurriculum />} />
            <Route path="/teacher/upload" element={<UploadMaterial />} />
            <Route path="/teacher/create-lesson" element={<CreateDynamicLesson />} />
            <Route path="/teacher/quiz-builder" element={<QuizBuilder />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/curriculum" element={<CurriculumManagement />} />
            <Route path="/admin/moderation" element={<MaterialModeration />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/reports" element={<ReportManagement />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}