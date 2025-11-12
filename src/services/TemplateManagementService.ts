/**
 * Template Management Service
 * 
 * Service for managing topic templates
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { TopicTemplate } from '../types/domain.js';

/**
 * Template definitions in Chinese (zh_TW)
 */
const TEMPLATES_ZH: TopicTemplate[] = [
  {
    template_id: 'victim_rights',
    name: '受害者權益',
    description: '關注受害者權益保護，強調司法應優先考慮受害者及其家屬的感受與需求',
    tone_guidelines: '同理受害者處境，強調司法應保護受害者權益，呼籲社會關注與支持',
    example_output: '在這起案件中，我們不能忘記受害者家屬的痛苦。司法制度應該優先保護受害者的權益，而不是一味地強調加害者的人權。我們呼籲社會各界關注受害者家屬的處境，給予他們應有的支持與尊重。'
  },
  {
    template_id: 'anti_death_penalty',
    name: '反廢死',
    description: '反對廢除死刑，主張對重大犯罪應維持死刑作為最終懲罰手段',
    tone_guidelines: '堅定立場，強調死刑的嚇阻作用，反駁廢死論點，呼籲維護社會正義',
    example_output: '死刑的存在是為了維護社會正義，對於殘忍的重大犯罪，死刑是必要的懲罰。廢除死刑只會讓加害者逃避應有的懲罰，對受害者家屬造成二次傷害。我們堅決反對廢死，要求政府維持死刑制度。'
  },
  {
    template_id: 'judicial_injustice',
    name: '司法不公',
    description: '揭露司法體系中的不公平現象，包括判決不一致、司法貪腐等問題',
    tone_guidelines: '客觀分析，提出具體案例，批判司法體系缺失，呼籲改革',
    example_output: '近期多起案件顯示，我國司法體系存在嚴重的判決不一致問題。相似的案件卻有天壤之別的判決結果，這不僅損害司法公信力，更讓人民對法治失去信心。我們呼籲司法改革，建立更透明、更公正的司法制度。'
  }
];

/**
 * Template definitions in English (en)
 */
const TEMPLATES_EN: TopicTemplate[] = [
  {
    template_id: 'victim_rights',
    name: 'Victim Rights',
    description: 'Focus on protecting victim rights, emphasizing that the justice system should prioritize the feelings and needs of victims and their families',
    tone_guidelines: 'Empathize with victims, emphasize judicial protection of victim rights, call for social attention and support',
    example_output: 'In this case, we cannot forget the pain of the victim\'s family. The justice system should prioritize protecting victim rights, rather than solely emphasizing the human rights of perpetrators. We call on all sectors of society to pay attention to the situation of victim families and give them the support and respect they deserve.'
  },
  {
    template_id: 'anti_death_penalty',
    name: 'Anti-Abolition of Death Penalty',
    description: 'Oppose the abolition of the death penalty, advocating that capital punishment should be maintained as the ultimate punishment for serious crimes',
    tone_guidelines: 'Firm stance, emphasize the deterrent effect of the death penalty, refute abolition arguments, call for upholding social justice',
    example_output: 'The death penalty exists to uphold social justice. For cruel and serious crimes, capital punishment is a necessary punishment. Abolishing the death penalty would only allow perpetrators to escape due punishment and cause secondary harm to victim families. We firmly oppose abolition and demand that the government maintain the death penalty system.'
  },
  {
    template_id: 'judicial_injustice',
    name: 'Judicial Injustice',
    description: 'Expose unfair phenomena in the judicial system, including inconsistent verdicts and judicial corruption',
    tone_guidelines: 'Objective analysis, provide specific cases, criticize judicial system deficiencies, call for reform',
    example_output: 'Recent cases show that our judicial system has serious problems with inconsistent verdicts. Similar cases have vastly different outcomes, which not only damages judicial credibility but also causes people to lose faith in the rule of law. We call for judicial reform to establish a more transparent and fair judicial system.'
  }
];

/**
 * Template Management Service
 * 
 * Provides access to topic templates with multi-language support
 */
export class TemplateManagementService {
  /**
   * Get all available templates
   * 
   * Requirement 5.1: Return template list within 500ms
   * Requirement 5.2: Return JSON array with required fields
   * Requirement 5.3: Provide templates for all topics
   * Requirement 5.5: Support zh_TW and en languages
   * 
   * @param lang - Language code (zh_TW or en, default: zh_TW)
   * @returns Array of topic templates
   */
  getTemplates(lang: string = 'zh_TW'): TopicTemplate[] {
    // Select templates based on language
    const templates = lang === 'en' ? TEMPLATES_EN : TEMPLATES_ZH;
    
    // Return a copy to prevent external modification
    return templates.map(t => ({ ...t }));
  }

  /**
   * Get template by ID
   * 
   * Requirement 5.2: Return template with all required fields
   * Requirement 5.5: Support language parameter
   * 
   * @param templateId - Template identifier
   * @param lang - Language code (zh_TW or en, default: zh_TW)
   * @returns Topic template
   * @throws Error if template not found
   */
  getTemplateById(templateId: string, lang: string = 'zh_TW'): TopicTemplate {
    const templates = this.getTemplates(lang);
    const template = templates.find(t => t.template_id === templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return template;
  }
}
