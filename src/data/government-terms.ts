import type { GlossaryTerm } from './glossary';
const principles='https://www.archives.gov/legislative/resources/education/constitution';
const constitution='https://www.archives.gov/founding-docs/constitution-transcript';
const rights='https://www.archives.gov/founding-docs/bill-of-rights/what-does-it-say';
const elections='https://www.eac.gov/sites/default/files/glossary_files/Glossary_of_Election_Terms_EAC.pdf';
const ap='https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description.pdf';
const house='https://www.house.gov/the-house-explained';
const term=(id:string,name:string,aliases:string[],definition:string,category:NonNullable<GlossaryTerm['category']>,sourceUrl:string):GlossaryTerm=>({id,term:name,aliases,definition,category,sourceUrl,verifiedAt:'2026-10-22'});
// Short, original explanations for civic learning; not an exhaustive AP course or legal advice.
export const governmentTerms:GlossaryTerm[]=[
 term('democracy','Democracy',[],'Government in which the people hold political power, exercising it directly or through elected representatives.','Government basics',elections),
 term('republic','Republic',['republicanism'],'Government based on the people’s authority and representation rather than hereditary monarchy. The United States is a constitutional republic and representative democracy.','Government basics',principles),
 term('federalism','Federalism',[],'A division of governing authority between a national government and state governments. It differs from separating power among branches.','Government basics',principles),
 term('separation-of-powers','Separation of powers',[],'The allocation of legislative, executive, and judicial responsibilities to different branches of government.','Government basics',principles),
 term('limited-government','Limited government',[],'The principle that government authority has legal boundaries, including constitutional restrictions and protected individual rights.','Government basics',principles),
 term('popular-sovereignty','Popular sovereignty',[],'The principle that the people are the ultimate source of legitimate governmental authority.','Government basics',principles),
 term('bicameral-legislature','Bicameral legislature',['bicameral','bicameralism'],'A legislature with two chambers. Congress consists of the House of Representatives and the Senate.','Government basics',house),
 term('constituent','Constituent',['constituents'],'A person represented by an elected official. Constituents include residents who cannot vote, not just registered voters.','Voting & elections',elections),
 term('incumbent','Incumbent',['incumbents'],'The person currently holding an office. An incumbent may run for reelection to that office.','Voting & elections',elections),
 term('swing-state','Swing state',['battleground state','swing states','battleground states'],'A state where competing parties have a realistic chance of winning a particular election. Which states are competitive changes over time.','Voting & elections','https://www.oxfordlearnersdictionaries.com/us/definition/english/swing-state'),
 term('bipartisan','Bipartisan',['bipartisanship'],'Involving cooperation or support from two political parties. It does not necessarily mean unanimous support within either party.','Political participation','https://www.oxfordlearnersdictionaries.com/us/definition/english/bipartisan'),
 term('gerrymandering','Gerrymandering',['partisan gerrymandering'],'Drawing electoral district boundaries to advantage a party or group. Partisan gerrymandering seeks a party advantage; racial gerrymandering raises distinct legal questions.','Voting & elections','https://constitution.congress.gov/browse/essay/amdt14-S1-8-2-1/ALDE_00013630/'),
 term('redistricting','Redistricting',[],'Redrawing electoral district boundaries. It is distinct from reapportionment, which reallocates seats among states.','Voting & elections',elections),
 term('reapportionment','Reapportionment',['apportionment'],'Allocating legislative seats among geographic areas. U.S. House seats are apportioned among states using population counts.','Voting & elections',house),
 term('direct-democracy','Direct democracy',[],'A system in which citizens decide public questions themselves, for example by voting on a ballot measure.','Government basics',elections),
 term('representative-democracy','Representative democracy',[],'A system in which voters choose representatives to make public decisions on their behalf.','Government basics',elections),
 term('enumerated-powers','Enumerated powers',['expressed powers'],'Powers explicitly granted by the Constitution, such as Congress’s authority to regulate interstate commerce.','Government basics',constitution),
 term('implied-powers','Implied powers',[],'Powers used to carry out expressly granted constitutional responsibilities, notably under the Necessary and Proper Clause.','Government basics',constitution),
 term('reserved-powers','Reserved powers',[],'Under the Tenth Amendment, powers not delegated to the federal government or prohibited to states remain with states or the people.','Government basics',rights),
 term('supremacy-clause','Supremacy Clause',[],'The constitutional rule that the Constitution, valid federal laws, and treaties take precedence over conflicting state law.','Government basics',constitution),
 term('commerce-clause','Commerce Clause',[],'The provision granting Congress power to regulate commerce with foreign nations, among states, and with Indian tribes.','Government basics',constitution),
 term('necessary-and-proper-clause','Necessary and Proper Clause',['elastic clause'],'The provision allowing Congress to enact laws needed to carry out federal constitutional powers.','Government basics',constitution),
 term('judicial-review','Judicial review',[],'Courts’ authority to evaluate whether government actions comply with the Constitution.','Government basics',ap),
 term('civil-liberties','Civil liberties',[],'Individual freedoms protected against government interference, including speech and religious exercise.','Rights & liberties',rights),
 term('civil-rights','Civil rights',[],'Protections against unequal treatment and discrimination, including equal access to political participation.','Rights & liberties',ap),
 term('bill-of-rights','Bill of Rights',[],'The first ten amendments to the U.S. Constitution, protecting individual freedoms and limiting government power.','Rights & liberties',rights),
 term('due-process','Due process',['due process of law'],'Constitutional protections against government deprivation of life, liberty, or property without legally required safeguards.','Rights & liberties',rights),
 term('equal-protection','Equal protection',['Equal Protection Clause'],'The Fourteenth Amendment’s requirement that states provide equal protection of the laws to people within their jurisdiction.','Rights & liberties','https://www.archives.gov/milestone-documents/14th-amendment'),
 term('establishment-clause','Establishment Clause',[],'The First Amendment provision restricting government establishment of religion.','Rights & liberties',rights),
 term('free-exercise-clause','Free Exercise Clause',[],'The First Amendment provision protecting religious exercise from government interference, subject to constitutional doctrine.','Rights & liberties',rights),
 term('selective-incorporation','Selective incorporation',[],'The process of applying most Bill of Rights protections to states through the Fourteenth Amendment.','Rights & liberties',ap),
 term('political-socialization','Political socialization',[],'How people develop political beliefs through family, education, peers, media, and other experiences.','Political participation',ap),
 term('political-ideology','Political ideology',[],'A connected set of beliefs about government’s role and public policy.','Political participation',ap),
 term('interest-group','Interest group',['interest groups'],'An organization seeking to influence public policy around shared interests or goals.','Political participation',ap),
 term('pluralism','Pluralism',['pluralist democracy'],'A view of politics in which competing groups influence policy through organization and participation.','Political participation',ap),
 term('political-efficacy','Political efficacy',[],'A person’s belief that they can understand politics and influence governmental decisions.','Political participation',ap),
 term('linkage-institution','Linkage institution',['linkage institutions'],'A channel connecting people with government, such as elections, political parties, interest groups, or the media.','Political participation',ap),
];
