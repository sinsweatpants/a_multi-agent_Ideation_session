import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Upload, FileText, Users, Zap, Target, Eye, MessageCircle, Heart, Brain, Settings, Check, AlertTriangle, Star, Loader, Filter, Shield, Globe, Smile, Search, Waves, Film, Puzzle } from 'lucide-react';

const ScenarioCritiqueSystem = () => {
  const [currentPhase, setCurrentPhase] = useState('input'); // البدء مباشرة في مرحلة الإدخال
  // لم نعد بحاجة لاختيار الأنواع، سيتم استخدام كل الوكلاء
  // const [selectedGenres, setSelectedGenres] = useState(['basic']);
  const [scenario, setScenario] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('');
  const [agentResults, setAgentResults] = useState({});
  const [finalReport, setFinalReport] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [analysisLogs, setAnalysisLogs] = useState([]);

  // تعريف الوكلاء الأساسية + المتخصصة
  const agentCategories = {
    basic: {
      name: 'الوكلاء الأساسية',
      description: 'الوكلاء الأساسية لتحليل أي نوع من السيناريوهات',
      icon: Settings,
      color: 'bg-gray-600',
      agents: {
        coordinator: {
          name: 'وكيل التنسيق',
          icon: Settings,
          color: 'bg-purple-500',
          description: 'إدارة الدورة الكاملة وتوزيع المهام',
          prompt: `أنت وكيل التنسيق في نظام تحليل السيناريوهات. دورك هو تقييم السيناريو من ناحية التنظيم العام والبنية الإجمالية.

قم بتحليل النص وإعطاء:
1. تقييم عام للبنية والتنظيم (من 100)
2. أهم 3-5 نقاط إيجابية
3. أهم 3-5 نقاط تحتاج تطوير
4. توصيات محددة للتحسين
5. مستوى الأولوية (عالي/متوسط/منخفض)

اجعل إجابتك في صيغة JSON مع الحقول: score, findings, recommendations, priority`
        },
        plotStructure: {
          name: 'وكيل بنية الحبكة',
          icon: Target,
          color: 'bg-blue-500',
          description: 'تحليل البنية الدرامية والهيكل العام',
          prompt: `أنت خبير في تحليل بنية الحبكة الدرامية. قم بتحليل السيناريو من ناحية:

- البنية الثلاثية (البداية، الوسط، النهاية)
- نقاط التحول الرئيسية
- تصاعد الأحداث والتشويق
- التوازن بين الخطوط الدرامية المختلفة
- قوة البداية والنهاية
- وضوح الهدف الدرامي

قدم تقييماً من 100 وحدد النقاط الإيجابية والسلبية والتوصيات. اجعل الرد في صيغة JSON.`
        },
        pacing: {
          name: 'وكيل الإيقاع والنبض',
          icon: Zap,
          color: 'bg-yellow-500',
          description: 'تقييم إيقاع السرد والتوقيت الدرامي',
          prompt: `أنت متخصص في تحليل إيقاع السرد الدرامي. ركز على:

- سرعة تطور الأحداث
- توازن المشاهد الهادئة والمتوترة
- التوقيت الدرامي
- نقاط الذروة والهدوء
- التحولات بين المشاهد
- الإيقاع العام للحلقة/المسلسل

قيم الإيقاع من 100 وقدم ملاحظات محددة. JSON format required.`
        },
        character: {
          name: 'وكيل تطوير الشخصيات',
          icon: Users,
          color: 'bg-indigo-500',
          description: 'تحليل عمق وتطور الشخصيات',
          prompt: `تخصصك هو تحليل الشخصيات في السيناريو:

- عمق وتعقيد الشخصيات
- وضوح الدوافع والأهداف
- التطور عبر الأحداث (character arc)
- التمايز بين الشخصيات
- الصراعات الداخلية
- الشخصيات الثانوية ودورها

قدم تقييماً شاملاً من 100 وتوصيات للتطوير. JSON format.`
        },
        dialogue: {
          name: 'وكيل جودة الحوار',
          icon: MessageCircle,
          color: 'bg-cyan-500',
          description: 'تحليل جودة وطبيعية الحوار',
          prompt: `تخصصك هو تقييم جودة الحوار:

- طبيعية الحوار وواقعيته
- تمايز أصوات الشخصيات
- فعالية الحوار في دفع الأحداث
- الإيقاع والنبرة
- تجنب الحوار التفسيري المفتعل
- القوة الدرامية للحوار

قدم درجة من 100 وتحليل مفصل. JSON format.`
        },
        emotionalImpact: {
          name: 'وكيل التأثير العاطفي',
          icon: Heart,
          color: 'bg-pink-600',
          description: 'تقييم القوة العاطفية والتأثير',
          prompt: `تخصصك هو تحليل التأثير العاطفي:

- قوة الاتصال العاطفي مع المشاهد
- تنوع المشاعر المثارة
- عمق التجربة العاطفية
- التدرج في بناء العاطفة
- المشاهد المؤثرة والمؤلمة
- الرضا العاطفي للمشاهد

قيم القوة العاطفية من 100. JSON format.`
        }
      }
    },
    socialDrama: {
      name: 'الدراما الاجتماعية',
      description: 'وكلاء متخصصة لتحليل الدراما الاجتماعية والواقعية',
      icon: Users,
      color: 'bg-green-600',
      agents: {
        socialRealism: {
          name: 'وكيل الواقعية الاجتماعية',
          icon: Globe,
          color: 'bg-green-500',
          description: 'تحليل دقة تمثيل الطبقات والبيئات المجتمعية',
          prompt: `أنت خبير في تحليل الواقعية الاجتماعية في الدراما. قم بتقييم:

- دقة تمثيل الطبقات الاجتماعية المختلفة
- واقعية البيئات المجتمعية (أحياء، مدارس، أماكن عمل)
- صحة تمثيل العادات والتقاليد
- منطقية التفاعلات الاجتماعية
- دقة تمثيل الظروف الاقتصادية
- واقعية المشاكل الاجتماعية المطروحة
- تجنب التنميط السطحي

قدم تقييماً من 100 مع تفصيل نقاط القوة والضعف. JSON format.`
        },
        contemporaryIssues: {
          name: 'وكيل القضايا المعاصرة',
          icon: AlertTriangle,
          color: 'bg-red-500',
          description: 'تقييم معالجة القضايا الراهنة',
          prompt: `تخصصك هو تحليل معالجة القضايا المعاصرة في الدراما:

- عمق معالجة قضايا التحرش والعنف
- تناول قضايا الفساد والرشوة
- معالجة قضايا البطالة والفقر
- تناول العدالة الاجتماعية
- معالجة قضايا التعليم والصحة
- تناول قضايا البيئة والتلوث
- توازن الطرح وعدم الانحياز
- الحساسية في التناول

احكم على جودة المعالجة من 100. JSON format.`
        },
        diversityRepresentation: {
          name: 'وكيل التنوع والتمثيل',
          icon: Users,
          color: 'bg-purple-500',
          description: 'فحص تمثيل الأقليات والفئات المختلفة',
          prompt: `أنت متخصص في تحليل التنوع والتمثيل:

- تمثيل الأقليات العرقية والدينية
- تمثيل الأشخاص ذوي الإعاقة
- تمثيل الفئات العمرية المختلفة
- توازن أدوار الرجال والنساء
- تمثيل الطبقات الاجتماعية المختلفة
- تجنب الصور النمطية السلبية
- احترام التنوع الثقافي
- الشمولية في التمثيل

قيم مستوى التنوع والشمولية من 100. JSON format.`
        }
      }
    },
    thriller: {
      name: 'الإثارة والتشويق',
      description: 'وكلاء متخصصة لأعمال الإثارة والتشويق',
      icon: Zap,
      color: 'bg-red-600',
      agents: {
        mysteryLogic: {
          name: 'وكيل الألغاز والأحاجي',
          icon: Puzzle,
          color: 'bg-indigo-500',
          description: 'تحليل منطق الألغاز وقابليتها للحل',
          prompt: `أنت خبير في تحليل الألغاز والأحاجي الدرامية:

- منطقية الألغاز المطروحة
- وجود أدلة كافية للحل
- عدالة اللغز للمشاهد
- تدرج الكشف عن الأدلة
- تجنب الحلول المفتعلة
- قوة الحلول وإقناعها
- التوازن بين الصعوبة والوضوح
- أصالة الألغاز وعدم تكرارها

احكم على جودة الألغاز من 100. JSON format.`
        },
        psychologicalTension: {
          name: 'وكيل التوتر النفسي',
          icon: Brain,
          color: 'bg-purple-600',
          description: 'قياس مستويات القلق والترقب',
          prompt: `تخصصك هو تحليل التوتر النفسي والترقب:

- بناء التوتر التدريجي
- استدامة القلق والترقب
- استخدام الصمت والتوقيت
- التلاعب بتوقعات المشاهد
- خلق الجو النفسي المناسب
- توزيع نقاط التوتر
- تجنب الإفراط المرهق
- التوازن مع فترات الراحة

قيم فعالية التوتر النفسي من 100. JSON format.`
        },
        actionSequences: {
          name: 'وكيل المطاردات والأكشن',
          icon: Zap,
          color: 'bg-orange-500',
          description: 'تقييم تسلسل المشاهد الحركية',
          prompt: `أنت خبير في تحليل مشاهد الأكشن والمطاردات:

- وضوح الجغرافيا المكانية
- منطقية التسلسل الحركي
- تصاعد الإثارة في المطاردة
- واقعية الحركات والقدرات
- التنوع في أنواع الأكشن
- ربط الأكشن بالقصة
- تجنب العنف المجاني
- الإبداع في التصميم

احكم على جودة مشاهد الأكشن من 100. JSON format.`
        }
      }
    },
    comedy: {
      name: 'الكوميديا',
      description: 'وكلاء متخصصة للأعمال الكوميدية',
      icon: Smile,
      color: 'bg-yellow-600',
      agents: {
        comedyTiming: {
          name: 'وكيل التوقيت الكوميدي',
          icon: Zap,
          color: 'bg-yellow-500',
          description: 'تحليل timing النكات والمواقف المضحكة',
          prompt: `تخصصك هو تحليل التوقيت الكوميدي:

- دقة توقيت النكات (timing)
- فعالية البناء والذروة الكوميدية
- استخدام الصمت والتوقف
- إيقاع الحوار الكوميدي
- التوازن بين الإعداد والنكتة
- تجنب المبالغة في التوقيت
- استخدام الجسد والحركة
- التدرج في التصعيد الكوميدي

قيم فعالية التوقيت الكوميدي من 100. JSON format.`
        },
        culturalComedy: {
          name: 'وكيل الكوميديا الثقافية',
          icon: Globe,
          color: 'bg-green-500',
          description: 'فحص الفكاهة المحلية والمراجع الثقافية',
          prompt: `أنت خبير في الكوميديا الثقافية المحلية:

- استخدام المراجع الثقافية المحلية
- فهم وتوظيف الفكاهة الشعبية
- احترام الحساسيات الثقافية
- تجنب الإساءة للثقافات الأخرى
- استخدام اللهجات الكوميدية
- توظيف العادات والتقاليد
- الأصالة في الطرح الكوميدي
- التوازن بين المحلي والعالمي

احكم على جودة الكوميديا الثقافية من 100. JSON format.`
        }
      }
    },
    advanced: {
      name: 'التحليل المتقدم',
      description: 'وكلاء متقدمة للتحليل النفسي والسردي العميق',
      icon: Brain,
      color: 'bg-indigo-600',
      agents: {
        dreamAnalysis: {
          name: 'وكيل تحليل الأحلام والرؤى',
          icon: Eye,
          color: 'bg-purple-500',
          description: 'تفسير المشاهد الرمزية والأحلام',
          prompt: `أنت محلل متخصص في الأحلام والرؤى الدرامية:

- رمزية الأحلام وصلتها بالواقع
- منطقية الأحلام نفسياً
- استخدام الأحلام لكشف اللاوعي
- الانتقال بين الحلم والواقع
- التأثير البصري للأحلام
- دور الأحلام في تطوير الحبكة
- التفسيرات المتعددة للرموز
- الأصالة في استخدام الرمزية

قيم عمق وثراء تحليل الأحلام من 100. JSON format.`
        },
        collectiveUnconscious: {
          name: 'وكيل اللاوعي الجمعي',
          icon: Users,
          color: 'bg-blue-600',
          description: 'تحليل الأنماط النمطية والرموز العامة',
          prompt: `تخصصك هو تحليل اللاوعي الجمعي والأنماط النمطية:

- استخدام الأنماط النمطية الإيجابية
- الرموز الثقافية المشتركة
- الموتيفات العالمية (البطل، الأم، الحكيم)
- المعاني اللاواعية في القصة
- الصور النمطية الأساسية
- التأثيرات النفسية العميقة
- الرنين مع اللاوعي الجمعي
- التوظيف الذكي للرموز

احكم على عمق الطرح النفسي من 100. JSON format.`
        },
        complexNarrative: {
          name: 'وكيل البنية السردية المعقدة',
          icon: Target,
          color: 'bg-red-500',
          description: 'للحبكات غير الخطية والزمن المتداخل',
          prompt: `أنت خبير في تحليل البنى السردية المعقدة:

- وضوح الخطوط الزمنية المتعددة
- منطقية القفزات الزمنية
- ربط الأحداث غير المتسلسلة
- فعالية الفلاش باك والفلاش فورورد
- التوازن بين التعقيد والوضوح
- استخدام السرد المتوازي
- التماسك رغم التعقيد
- الإبداع في البنية السردية

قيم فعالية البنية المعقدة من 100. JSON format.`
        }
      }
    }
  };

  // دالة للحصول على جميع الوكلاء من كل الفئات
  const getAllAgents = () => {
    let agents = {};
    Object.values(agentCategories).forEach(category => {
      agents = { ...agents, ...category.agents };
    });
    return agents;
  };

  // دالة تحليل وهمية (Mock) تحاكي استجابة النموذج بدلاً من استدعاء API
  const analyzeWithAgent = async (agentKey, agentData, scenario) => {
    // محاكاة تأخير الشبكة لإعطاء شعور بالواقعية
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    const priorities = ['عالي', 'متوسط', 'منخفض'];

    // إنشاء استجابة وهمية مع بيانات عشوائية
    const mockResponse = {
      score: Math.floor(Math.random() * 41) + 60, // نتيجة بين 60 و 100
      findings: [
        `تم تحديد نقطة قوة رئيسية بواسطة ${agentData.name}.`,
        "التحليل كشف عن بعض التناقضات الطفيفة في الحبكة.",
        "الحوار بين الشخصيات يبدو طبيعياً ومقنعاً."
      ],
      recommendations: [
        `توصية من ${agentData.name}: زيادة عمق الشخصية الثانوية.`,
        "إعادة النظر في إيقاع الأحداث في منتصف القصة.",
        "تعزيز الدافع الرئيسي وراء تصرفات البطل."
      ],
      priority: priorities[Math.floor(Math.random() * priorities.length)]
    };

    // محاكاة فشل عشوائي بنسبة 5%
    if (Math.random() < 0.05) {
        console.error(`فشل محاكاة للوكيل: ${agentData.name}`);
        return {
            score: 0,
            findings: [`حدث خطأ محاكاة أثناء تحليل ${agentData.name}`],
            recommendations: ["إعادة المحاولة قد تحل المشكلة"],
            priority: "عالي"
        };
    }

    return mockResponse;
  };

  // إضافة لوج للتحليل
  const addLog = (message) => {
    setAnalysisLogs(prev => [...prev, { message, timestamp: new Date().toLocaleTimeString('ar-EG') }]);
  };

  // تشغيل التحليل الحقيقي
  const startAnalysis = async () => {
    if (!scenario.trim()) return;

    setIsAnalyzing(true);
    setCurrentPhase('analyzing');
    setAnalysisProgress(0);
    setAnalysisLogs([]);

    const selectedAgents = getAllAgents(); // استخدام جميع الوكلاء
    const agentCount = Object.keys(selectedAgents).length;

    addLog(`بدء التحليل الشامل باستخدام ${agentCount} وكيل متخصص...`);

    const agentKeys = Object.keys(selectedAgents);
    const results = {};

    for (let i = 0; i < agentKeys.length; i++) {
      const agentKey = agentKeys[i];
      const agent = selectedAgents[agentKey];

      setCurrentAgent(agent.name);
      addLog(`جاري تحليل: ${agent.name}...`);
      setAnalysisProgress(((i + 1) / agentKeys.length) * 100);

      try {
        results[agentKey] = await analyzeWithAgent(agentKey, agent, scenario);
        addLog(`اكتمل تحليل: ${agent.name} - النتيجة: ${results[agentKey].score}%`);
      } catch (error) {
        addLog(`خطأ في تحليل: ${agent.name}`);
        results[agentKey] = {
          score: 0,
          findings: ["حدث خطأ في التحليل"],
          recommendations: ["إعادة المحاولة"],
          priority: "عالي"
        };
      }
    }

    setAgentResults(results);

    // إنشاء التقرير النهائي
    const validScores = Object.values(results).filter(r => r.score > 0);
    const overallScore = validScores.length > 0 ?
      Math.round(validScores.reduce((sum, result) => sum + result.score, 0) / validScores.length) : 0;

    setFinalReport({
      overallScore,
      totalIssues: Object.values(results).reduce((sum, result) => sum + result.findings.length, 0),
      highPriorityIssues: Object.values(results).filter(result => result.priority === 'عالي').length,
      strengths: Object.values(results).filter(result => result.score >= 80).length,
      weaknesses: Object.values(results).filter(result => result.score < 70).length,
      selectedGenres: Object.keys(agentCategories).length // عدد الفئات الكلي
    });

    addLog("اكتمل التحليل الشامل!");
    setCurrentAgent('');
    setIsAnalyzing(false);
    setCurrentPhase('results');
  };

  const resetSystem = () => {
    setCurrentPhase('input'); // العودة إلى مرحلة الإدخال
    // لم نعد بحاجة لإعادة تعيين الأنواع
    setScenario('');
    setAnalysisProgress(0);
    setIsAnalyzing(false);
    setCurrentAgent('');
    setAgentResults({});
    setFinalReport(null);
    setSelectedAgent(null);
    setAnalysisLogs([]);
  };

  const exportReport = () => {
    const report = {
      scenario: scenario.substring(0, 500) + (scenario.length > 500 ? '...' : ''),
      selectedGenres: Object.keys(agentCategories), // تصدير كل أسماء الفئات
      timestamp: new Date().toISOString(),
      overallResults: finalReport,
      detailedResults: agentResults,
      analysisLogs: analysisLogs
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // لم نعد بحاجة لهذه الدالة
  // const handleGenreToggle = ...

  const AgentCard = ({ agentKey, agent, result, category }) => {
    const Icon = agent.icon;
    const isSelected = selectedAgent === agentKey;

    return (
      <div
        className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all duration-300 border-2 ${
          isSelected ? 'border-blue-500 scale-105' : 'border-transparent hover:shadow-lg'
        }`}
        onClick={() => setSelectedAgent(isSelected ? null : agentKey)}
      >
        <div className="flex items-center mb-3">
          <div className={`${agent.color} p-2 rounded-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="mr-3 flex-1">
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <p className="text-xs text-gray-500">{category || 'عام'}</p>
          </div>
          {result && (
            <div className="text-center">
              <div className={`text-lg font-bold ${
                result.score >= 80 ? 'text-green-600' :
                result.score >= 60 ? 'text-yellow-600' :
                result.score > 0 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {result.score}%
              </div>
              <div className={`w-2 h-2 rounded-full mx-auto ${
                result.priority === 'عالي' ? 'bg-red-500' :
                result.priority === 'متوسط' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
            </div>
          )}
        </div>

        {isSelected && result && (
          <div className="mt-4 space-y-3 animate-fadeIn">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-gray-700">النتائج:</h4>
              <ul className="text-xs space-y-1">
                {result.findings.map((finding, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-blue-500 rounded-full mt-2 ml-2 flex-shrink-0"></span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 text-gray-700">التوصيات:</h4>
              <ul className="text-xs space-y-1">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full mt-2 ml-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            نظام Multi-Agent المتطور للتحليل الشامل
          </h1>
          <p className="text-gray-600">
            يستخدم هذا النظام مجموعة كاملة من الوكلاء المتخصصين لتحليل السيناريو الخاص بك بعمق.
          </p>
        </div>

        {/* مرحلة الإعداد لم تعد موجودة، ننتقل مباشرة إلى الإدخال */}

        {/* Input Phase */}
        {currentPhase === 'input' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <FileText className="w-6 h-6 ml-2" />
              إدخال السيناريو
            </h2>

            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>تحليل شامل:</strong> سيتم استخدام <strong>{Object.keys(getAllAgents()).length}</strong> وكيل متخصص من <strong>{Object.keys(agentCategories).length}</strong> فئات مختلفة لضمان أقصى دقة.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نص السيناريو أو الملخص التفصيلي:
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="ألصق هنا نص السيناريو الكامل أو اكتب ملخصاً تفصيلياً للحلقات... كلما كان النص أكثر تفصيلاً، كان التحليل أدق وأعمق."
                  className="w-full h-80 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  عدد الكلمات: {scenario.split(' ').length} | الأحرف: {scenario.length}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startAnalysis}
                  disabled={!scenario.trim() || scenario.length < 100}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-5 h-5 ml-2" />
                  بدء التحليل المتخصص
                </button>

                {/* زر تغيير الوكلاء لم يعد ضرورياً */}

                <button
                  className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-5 h-5 ml-2" />
                  رفع ملف
                </button>
              </div>

              {scenario.length > 0 && scenario.length < 100 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    يرجى إدخال نص أكثر تفصيلاً (على الأقل 100 حرف) للحصول على تحليل مفيد.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Phase */}
        {currentPhase === 'analyzing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Brain className="w-6 h-6 ml-2" />
                جاري التحليل المتخصص ({Object.keys(getAllAgents()).length} وكيل)
              </h2>

              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">تقدم التحليل</span>
                    <span className="text-sm text-blue-600">{Math.round(analysisProgress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${analysisProgress}%` }}
                    ></div>
                  </div>
                  {currentAgent && (
                    <div className="mt-2 flex items-center text-sm text-blue-800">
                      <Loader className="w-4 h-4 ml-2 animate-spin" />
                      يحلل الآن: {currentAgent}
                    </div>
                  )}
                </div>

                {/* عرض جميع فئات الوكلاء */}
                {Object.entries(agentCategories).map(([genreKey, category]) => {
                  const agents = category.agents;

                  return (
                    <div key={genreKey} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center">
                        <category.icon className="w-5 h-5 ml-2" />
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(agents).map(([key, agent]) => {
                          const Icon = agent.icon;
                          const allAgents = getAllAgents();
                          const agentIndex = Object.keys(allAgents).indexOf(key);
                          const isCompleted = analysisProgress > ((agentIndex + 1) / Object.keys(allAgents).length) * 100;
                          const isActive = currentAgent === agent.name;

                          return (
                            <div
                              key={key}
                              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                                isActive ? `${agent.color} text-white scale-110 shadow-lg` :
                                isCompleted ? 'bg-green-100 text-green-800' :
                                'bg-white text-gray-500'
                              }`}
                            >
                              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'animate-pulse' : ''}`} />
                              <span className="text-xs text-center font-medium">{agent.name}</span>
                              {isCompleted && !isActive && (
                                <Check className="w-4 h-4 text-green-600 mt-1" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analysis Logs */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 ml-2" />
                سجل التحليل المباشر
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 h-48 overflow-y-auto">
                {analysisLogs.map((log, idx) => (
                  <div key={idx} className="text-green-400 text-sm font-mono mb-1">
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {currentPhase === 'results' && (
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Star className="w-6 h-6 ml-2" />
                التقرير الإجمالي المتخصص
              </h2>

              {finalReport && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      finalReport.overallScore >= 80 ? 'text-green-600' :
                      finalReport.overallScore >= 70 ? 'text-yellow-600' :
                      finalReport.overallScore >= 60 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {finalReport.overallScore}%
                    </div>
                    <div className="text-sm text-gray-500">النتيجة الإجمالية</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{finalReport.selectedGenres}</div>
                    <div className="text-sm text-gray-500">فئات متخصصة</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Object.keys(agentResults).length}</div>
                    <div className="text-sm text-gray-500">إجمالي الوكلاء</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{finalReport.highPriorityIssues}</div>
                    <div className="text-sm text-gray-500">أولوية عالية</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{finalReport.strengths}</div>
                    <div className="text-sm text-gray-500">نقاط قوة</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{finalReport.weaknesses}</div>
                    <div className="text-sm text-gray-500">نقاط ضعف</div>
                  </div>
                </div>
              )}
            </div>

            {/* Results by Category */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center">
                  <Users className="w-6 h-6 ml-2" />
                  نتائج الوكلاء المتخصصة
                </h2>

                <div className="flex gap-2">
                  <button
                    onClick={exportReport}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تصدير التقرير
                  </button>

                  <button
                    onClick={resetSystem}
                    className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 ml-2" />
                    تحليل جديد
                  </button>
                </div>
              </div>

              {Object.entries(agentCategories).map(([genreKey, category]) => {
                const categoryAgents = Object.entries(category.agents).filter(([key]) => agentResults[key]);

                if (categoryAgents.length === 0) return null;

                return (
                  <div key={genreKey} className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <category.icon className="w-6 h-6 ml-2" />
                      {category.name}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryAgents.map(([key, agent]) => (
                        <AgentCard
                          key={key}
                          agentKey={key}
                          agent={agent}
                          result={agentResults[key]}
                          category={category.name}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ScenarioCritiqueSystem;
