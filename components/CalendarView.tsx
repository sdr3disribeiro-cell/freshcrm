import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Company } from '../types';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  isToday, addDays, subDays, getHours, addWeeks, subWeeks, isSameWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle, LayoutGrid } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  companies: Company[];
  onToggleTask: (taskId: string) => void;
}

type ViewMode = 'month' | 'week' | 'day';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, companies, onToggleTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8am on day/week view mount
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
        // Scroll roughly to 08:00 (8 * 60px height approx)
        scrollRef.current.scrollTop = 480;
    }
  }, [viewMode]);

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const daysInWeek = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    const end = endOfWeek(currentDate, { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.dueDate), date)).sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Empresa desconhecida';
  };

  // Navigation Handlers
  const handlePrev = () => {
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
      else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
      else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
      setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
      setCurrentDate(day);
      setViewMode('day');
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
          const [y, m, d] = e.target.value.split('-').map(Number);
          // Create date at noon to avoid timezone rollover issues
          setCurrentDate(new Date(y, m - 1, d, 12));
      }
  };

  // --- Render Functions ---

  const renderMonthGrid = () => (
    <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8">
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
        
        {daysInMonth.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div 
              key={day.toString()} 
              onClick={() => handleDayClick(day)}
              className={`min-h-[100px] lg:min-h-[120px] bg-white p-2 transition-colors cursor-pointer hover:bg-slate-50 relative ${
                !isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'text-slate-800'
              } ${isToday(day) ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday(day) ? 'bg-blue-600 text-white shadow-sm' : ''
                }`}>
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-medium">
                    {dayTasks.length}
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id}
                    className={`text-[10px] lg:text-xs px-1.5 py-1 rounded border-l-2 truncate ${
                      task.isCompleted 
                        ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' 
                        : 'bg-blue-50/50 border-blue-400 text-blue-700'
                    }`}
                    title={task.title}
                  >
                    {format(new Date(task.dueDate), 'HH:mm')} {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                    <div className="text-[10px] text-slate-400 pl-1">
                        + {dayTasks.length - 3} mais
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const currentHour = new Date().getHours();
    
    return (
        <div className="flex-1 flex flex-col overflow-hidden px-4 lg:px-8 pb-4">
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-white flex-shrink-0">
                <div className="w-16 border-r border-slate-100 p-2 text-xs text-slate-400 text-center flex items-end justify-center pb-2">
                    GMT-3
                </div>
                {daysInWeek.map(day => (
                    <div 
                        key={day.toString()} 
                        onClick={() => handleDayClick(day)}
                        className={`text-center py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-50 ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                    >
                        <div className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase mb-0.5">
                            {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className={`text-sm lg:text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                            isToday(day) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'
                        }`}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Week Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white" ref={scrollRef}>
                <div className="grid grid-cols-8 min-h-[1440px]">
                     {/* Time Labels Column */}
                    <div className="border-r border-slate-100 bg-slate-50/30 sticky left-0 z-10">
                        {hours.map(h => (
                            <div key={h} className="h-[60px] border-b border-slate-100 text-[10px] text-slate-400 font-medium flex justify-center pt-2">
                                {h.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {daysInWeek.map(day => {
                        const dayTasks = getTasksForDay(day);
                        return (
                            <div key={day.toString()} className="border-r border-slate-100 relative group">
                                {hours.map(h => (
                                    <div key={h} className="h-[60px] border-b border-slate-50 relative"></div>
                                ))}
                                
                                {/* Current Time Line (only if today) */}
                                {isToday(day) && (
                                     <div 
                                        className="absolute left-0 right-0 border-t-2 border-red-400 z-10 pointer-events-none"
                                        style={{ top: `${(new Date().getHours() * 60) + new Date().getMinutes()}px` }}
                                     ></div>
                                )}

                                {/* Tasks Positioning */}
                                {dayTasks.map(task => {
                                    const taskDate = new Date(task.dueDate);
                                    const topPos = (getHours(taskDate) * 60) + taskDate.getMinutes();
                                    
                                    return (
                                        <div 
                                            key={task.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleTask(task.id);
                                            }}
                                            className={`absolute left-1 right-1 p-1.5 rounded border-l-2 text-[10px] shadow-sm cursor-pointer hover:z-20 hover:scale-[1.02] transition-all overflow-hidden ${
                                                task.isCompleted
                                                    ? 'bg-slate-50 border-slate-300 opacity-60 text-slate-400 line-through'
                                                    : 'bg-blue-50 border-blue-500 text-blue-900'
                                            }`}
                                            style={{ 
                                                top: `${topPos}px`, 
                                                height: '50px',
                                                zIndex: 1
                                            }}
                                            title={`${task.title} - ${getCompanyName(task.companyId)}`}
                                        >
                                            <div className="font-bold truncate">{task.title}</div>
                                            <div className="truncate opacity-70">{format(taskDate, 'HH:mm')}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = getTasksForDay(currentDate);
    const isTodayView = isToday(currentDate);
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();

    return (
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8 relative custom-scrollbar" ref={scrollRef}>
             <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm min-h-[1440px] relative">
                 {/* Current Time Indicator Line */}
                 {isTodayView && (
                     <div 
                        className="absolute left-16 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                        style={{ top: `${(currentHour * 60) + currentMinutes}px` }}
                     >
                        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                        <span className="bg-red-500 text-white text-[9px] px-1 rounded ml-1 font-bold">
                            {format(new Date(), 'HH:mm')}
                        </span>
                     </div>
                 )}

                 {hours.map(hour => {
                     // Filter tasks for this specific hour block
                     const tasksInHour = dayTasks.filter(t => getHours(new Date(t.dueDate)) === hour);

                     return (
                         <div key={hour} className="flex border-b border-slate-100 h-[60px] group">
                             {/* Time Label */}
                             <div className="w-16 flex-shrink-0 border-r border-slate-100 flex justify-center pt-2">
                                 <span className="text-xs text-slate-400 font-medium">
                                     {hour.toString().padStart(2, '0')}:00
                                 </span>
                             </div>

                             {/* Task Area */}
                             <div className="flex-1 relative p-1">
                                 {/* Half-hour guide line (visible on hover) */}
                                 <div className="absolute top-1/2 left-0 right-0 border-t border-slate-50 opacity-0 group-hover:opacity-100 pointer-events-none"></div>

                                 {tasksInHour.map(task => {
                                     const taskDate = new Date(task.dueDate);
                                     const minutes = taskDate.getMinutes();
                                     const topPos = (minutes / 60) * 100;
                                     
                                     return (
                                        <div 
                                            key={task.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleTask(task.id);
                                            }}
                                            className={`absolute left-2 right-2 p-2 rounded-lg border-l-4 shadow-sm cursor-pointer transition-all hover:z-20 hover:scale-[1.01] ${
                                                task.isCompleted
                                                    ? 'bg-slate-50 border-slate-300 opacity-60'
                                                    : 'bg-blue-50 border-blue-500'
                                            }`}
                                            style={{ 
                                                top: `${topPos}%`, 
                                                minHeight: '45px',
                                                zIndex: 1
                                            }}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    task.isCompleted ? 'bg-green-100 border-green-500 text-green-600' : 'border-blue-300'
                                                }`}>
                                                    {task.isCompleted && <CheckCircle size={10} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className={`text-xs font-bold truncate ${task.isCompleted ? 'text-slate-500 line-through' : 'text-blue-900'}`}>
                                                        {task.title}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 truncate flex gap-1">
                                                        <span>{format(taskDate, 'HH:mm')}</span>
                                                        <span>•</span>
                                                        <span>{getCompanyName(task.companyId)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-8 py-6 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {viewMode !== 'month' && (
              <button 
                onClick={() => setViewMode('month')} 
                className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                title="Voltar ao Mês"
              >
                  <ArrowLeft size={20} />
              </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {viewMode === 'month' ? 'Calendário' : viewMode === 'week' ? 'Visão Semanal' : 'Agenda do Dia'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 hidden md:block">
                {viewMode === 'month' 
                    ? 'Visão geral de tarefas e entregas' 
                    : viewMode === 'week'
                    ? `Semana de ${format(startOfWeek(currentDate, {locale: ptBR}), "dd/MMM")} a ${format(endOfWeek(currentDate, {locale: ptBR}), "dd/MMM")}`
                    : `Programação horária para ${format(currentDate, "dd 'de' MMMM", { locale: ptBR })}`
                }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
            <button 
                onClick={handleToday}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
                Hoje
            </button>
            
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 relative">
                <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded shadow-sm transition-all text-slate-600">
                    <ChevronLeft size={18} />
                </button>
                
                {/* Date Picker Trigger */}
                <div className="relative group">
                    <input 
                        type="date" 
                        onChange={handleDateJump}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="px-2 md:px-4 font-semibold text-slate-700 min-w-[120px] md:min-w-[140px] text-center text-sm select-none group-hover:text-blue-600 transition-colors cursor-pointer flex items-center justify-center gap-2">
                        {viewMode === 'month' 
                            ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                            : viewMode === 'week'
                            ? `Semana ${format(currentDate, 'w')}`
                            : format(currentDate, "dd/MM/yyyy")
                        }
                    </div>
                </div>

                <button onClick={handleNext} className="p-1.5 hover:bg-white rounded shadow-sm transition-all text-slate-600">
                    <ChevronRight size={18} />
                </button>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setViewMode('month')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Mês"
                >
                    <CalendarIcon size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('week')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Semana"
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('day')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Dia"
                >
                    <Clock size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'month' && renderMonthGrid()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarView;