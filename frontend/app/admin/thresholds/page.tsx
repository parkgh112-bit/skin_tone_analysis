"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Settings, Save, RefreshCw } from "lucide-react";

interface ToneThreshold {
  id: number;
  tone: string;
  min: number;
  max: number;
}

interface SkinThreshold {
  id: number;
  type: string;
  melanin_min: number;
  melanin_max: number;
  redness_min: number;
  redness_max: number;
}

export default function AdminThresholdsPage() {
  const [toneThresholds, setToneThresholds] = useState<ToneThreshold[]>([]);
  const [skinThresholds, setSkinThresholds] = useState<SkinThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchThresholds = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/admin/thresholds");
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setToneThresholds(data.tone_thresholds);
      setSkinThresholds(data.skin_thresholds);
    } catch (error) {
      console.error("Failed to fetch thresholds:", error);
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const handleUpdate = async (table: "tone" | "skin", id: number, updates: any) => {
    const saveKey = `${table}-${id}`;
    setSaving(saveKey);
    try {
      const response = await fetch("http://localhost:5000/api/admin/thresholds/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id, updates }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("업데이트 완료!");
        // 로컬 상태 업데이트
        if (table === "tone") {
          setToneThresholds(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } else {
          setSkinThresholds(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen">데이터 로딩 중...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8" />
            진단 임계값 관리
          </h2>
          <p className="text-muted-foreground">
            피부톤(Tone) 및 피부상태(Skin Type) 판별 기준을 세밀하게 조정합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchThresholds}>
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-1">
        {/* 1. Tone Threshold Management */}
        <Card>
          <CardHeader>
            <CardTitle>피부톤(Tone) 임계값</CardTitle>
            <CardDescription>
              명도(L*) 기준에 따른 톤 분류 기준입니다. (0 ~ 100 범위)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>명칭</TableHead>
                  <TableHead>최소값 (Min)</TableHead>
                  <TableHead>최대값 (Max)</TableHead>
                  <TableHead>범위 조정 (Slider)</TableHead>
                  <TableHead className="w-[100px]">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toneThresholds.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.tone}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={row.min}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setToneThresholds(prev => prev.map(t => t.id === row.id ? { ...t, min: val } : t));
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={row.max}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setToneThresholds(prev => prev.map(t => t.id === row.id ? { ...t, max: val } : t));
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <Slider
                        defaultValue={[row.min, row.max]}
                        max={100}
                        step={0.1}
                        onValueCommit={(vals) => {
                          handleUpdate("tone", row.id, { min: vals[0], max: vals[1] });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={saving === `tone-${row.id}`}
                        onClick={() => handleUpdate("tone", row.id, { min: row.min, max: row.max })}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 2. Skin Type Threshold Management */}
        <Card>
          <CardHeader>
            <CardTitle>피부타입(Skin Type) 임계값</CardTitle>
            <CardDescription>
              멜라닌(Melanin) 및 홍조(Redness) 지수 기준 분류입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>타입</TableHead>
                  <TableHead>멜라닌 (Min/Max)</TableHead>
                  <TableHead>홍조 (Min/Max)</TableHead>
                  <TableHead className="w-[100px]">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skinThresholds.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={row.melanin_min}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSkinThresholds(prev => prev.map(s => s.id === row.id ? { ...s, melanin_min: val } : s));
                          }}
                          className="w-20"
                        />
                        <span>~</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={row.melanin_max}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSkinThresholds(prev => prev.map(s => s.id === row.id ? { ...s, melanin_max: val } : s));
                          }}
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={row.redness_min}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSkinThresholds(prev => prev.map(s => s.id === row.id ? { ...s, redness_min: val } : s));
                          }}
                          className="w-20"
                        />
                        <span>~</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={row.redness_max}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSkinThresholds(prev => prev.map(s => s.id === row.id ? { ...s, redness_max: val } : s));
                          }}
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={saving === `skin-${row.id}`}
                        onClick={() => handleUpdate("skin", row.id, { 
                          melanin_min: row.melanin_min, 
                          melanin_max: row.melanin_max,
                          redness_min: row.redness_min,
                          redness_max: row.redness_max
                        })}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
