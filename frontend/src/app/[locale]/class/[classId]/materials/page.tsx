'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText,
  Download,
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
import { getClassById } from '@/lib/queries';
import { createClient } from '@/lib/supabase/client';

interface MaterialItem {
  id: number | string;
  name: string;
  type: string;
  size: string;
  url: string;
  completed: boolean;
}

interface NoteItem {
  id: number | string;
  time: string;
  content: string;
  highlight: boolean;
}

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
  const [classData, setClassData] = React.useState({
    id: '',
    topic: '',
    completedAt: '',
    teacher: '',
  });
  const [materials, setMaterials] = React.useState<{
    beforeClass: MaterialItem[];
    duringClass: MaterialItem[];
    afterClass: MaterialItem[];
  }>({ beforeClass: [], duringClass: [], afterClass: [] });
  const [notes] = React.useState<NoteItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getClassById(params.classId) as Record<string, unknown>;
        const teacher = data.profiles as Record<string, unknown> | null;

        setClassData({
          id: (data.id as string) || '',
          topic: (data.title as string) || 'Class',
          completedAt: (data.end_time as string) || '',
          teacher: (teacher?.full_name as string) || 'Teacher',
        });

        // Fetch materials from storage if materials_url exists
        const materialsUrl = data.materials_url as string | null;
        if (materialsUrl) {
          const supabase = createClient();
          const { data: files } = await supabase.storage
            .from('class-materials')
            .list(params.classId);

          if (files && files.length > 0) {
            const mapped: MaterialItem[] = files.map((f, idx) => ({
              id: idx,
              name: f.name,
              type: f.name.split('.').pop() || 'file',
              size: `${Math.round((f.metadata?.size || 0) / 1024)} KB`,
              url: `class-materials/${params.classId}/${f.name}`,
              completed: false,
            }));
            setMaterials({ beforeClass: mapped, duringClass: [], afterClass: [] });
          }
        }
      } catch (err) {
        console.error('Error fetching class materials:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.classId]);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderMaterialsList = (materialsList: MaterialItem[]) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
      {materialsList.map((material) => (
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
              <h1 className="text-2xl font-bold text-white mb-2">{classData.topic}</h1>
              <p className="text-slate-400">
                Giáo viên: {classData.teacher} • 
                Hoàn thành: {new Date(classData.completedAt).toLocaleDateString('vi-VN')}
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
              {renderMaterialsList(materials.beforeClass)}
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
              {renderMaterialsList(materials.duringClass)}
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
              {renderMaterialsList(materials.afterClass)}
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
                  {notes.map((note) => (
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
