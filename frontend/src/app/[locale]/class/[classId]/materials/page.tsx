'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText,
  Download,
  ExternalLink,
  BookOpen,
  Video,
  Image as ImageIcon,
  File,
  ChevronLeft,
  Eye,
  Clock,
  CheckCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock materials data
const mockClassData = {
  id: 'class-1',
  topic: 'Business English: Meeting Skills',
  completedAt: '2026-01-23T09:30:00+07:00',
  teacher: 'Nguyễn Minh Anh',
};

const mockMaterials = {
  beforeClass: [
    {
      id: 1,
      name: 'Vocabulary List - Meeting Terms',
      type: 'pdf',
      size: '234 KB',
      url: '#',
      completed: true,
    },
    {
      id: 2,
      name: 'Pre-class Reading: Effective Meetings',
      type: 'doc',
      size: '156 KB',
      url: '#',
      completed: true,
    },
  ],
  duringClass: [
    {
      id: 3,
      name: 'Lesson Slides - Meeting Skills',
      type: 'slides',
      size: '1.2 MB',
      url: '#',
      completed: true,
    },
    {
      id: 4,
      name: 'Role-play Scenarios',
      type: 'pdf',
      size: '89 KB',
      url: '#',
      completed: true,
    },
    {
      id: 5,
      name: 'Audio: Sample Meeting Dialogue',
      type: 'audio',
      size: '3.4 MB',
      url: '#',
      completed: true,
    },
  ],
  afterClass: [
    {
      id: 6,
      name: 'Homework: Write Meeting Agenda',
      type: 'doc',
      size: '45 KB',
      url: '#',
      completed: false,
    },
    {
      id: 7,
      name: 'Practice Exercises',
      type: 'pdf',
      size: '178 KB',
      url: '#',
      completed: false,
    },
    {
      id: 8,
      name: 'Supplementary Video: TED Talk',
      type: 'video',
      size: 'External',
      url: '#',
      completed: false,
    },
  ],
};

const mockNotes = [
  {
    id: 1,
    time: '09:05',
    content: 'Key phrase: "Let\'s get started" - formal opening',
    highlight: true,
  },
  {
    id: 2,
    time: '09:12',
    content: 'Remember: Use "I\'d like to suggest..." instead of "I think we should..."',
    highlight: false,
  },
  {
    id: 3,
    time: '09:20',
    content: 'Action items should always have a deadline and assigned person',
    highlight: true,
  },
  {
    id: 4,
    time: '09:25',
    content: 'Closing phrase: "Thank you all for your time"',
    highlight: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ClassMaterialsPage({ params }: { params: { classId: string } }) {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'doc':
        return <File className="w-5 h-5 text-blue-400" />;
      case 'slides':
        return <BookOpen className="w-5 h-5 text-amber-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-400" />;
      case 'audio':
        return <Video className="w-5 h-5 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-pink-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const renderMaterialsList = (materials: typeof mockMaterials.beforeClass) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
      {materials.map((material) => (
        <motion.div key={material.id} variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 hover:border-[#3B82F6]/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(material.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{material.name}</p>
                      {material.completed && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {material.type.toUpperCase()} • {material.size}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <Eye className="w-4 h-4 mr-1" />
                    Xem
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/student/bookings">
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{mockClassData.topic}</h1>
              <p className="text-slate-400">
                Giáo viên: {mockClassData.teacher} • 
                Hoàn thành: {new Date(mockClassData.completedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
              <CheckCircle className="w-3 h-3 mr-1" />
              Đã hoàn thành
            </Badge>
          </div>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="materials" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="materials" className="data-[state=active]:bg-[#3B82F6]">
              Tài liệu
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-[#3B82F6]">
              Ghi chú
            </TabsTrigger>
            <TabsTrigger value="recording" className="data-[state=active]:bg-[#3B82F6]">
              Bản ghi
            </TabsTrigger>
          </TabsList>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-6">
            {/* Before Class */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-400 border-0">Trước lớp</Badge>
                Tài liệu chuẩn bị
              </h3>
              {renderMaterialsList(mockMaterials.beforeClass)}
            </motion.div>

            {/* During Class */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">Trong lớp</Badge>
                Tài liệu bài học
              </h3>
              {renderMaterialsList(mockMaterials.duringClass)}
            </motion.div>

            {/* After Class */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Sau lớp</Badge>
                Bài tập về nhà
              </h3>
              {renderMaterialsList(mockMaterials.afterClass)}
            </motion.div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  <span>Ghi chú từ buổi học</span>
                  <Button variant="outline" size="sm" className="border-white/20 text-white">
                    <Download className="w-4 h-4 mr-1" />
                    Tải xuống
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {mockNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      variants={itemVariants}
                      className={`p-4 rounded-lg border ${
                        note.highlight
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Badge className="bg-slate-700 text-slate-300 border-0 shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          {note.time}
                        </Badge>
                        <p className="text-white">{note.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <Button className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                    Thêm ghi chú mới
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recording Tab */}
          <TabsContent value="recording">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Video bản ghi buổi học</p>
                    <p className="text-sm text-slate-500">25 phút</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                    <Video className="w-4 h-4 mr-2" />
                    Xem bản ghi
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white">
                    <Download className="w-4 h-4 mr-2" />
                    Tải xuống
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    ⏰ Bản ghi sẽ được lưu trong 30 ngày. Hãy tải xuống nếu bạn muốn giữ lâu hơn.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
