// ==================== 유틸 함수 ====================

// localStorage에서 배열 로드
function loadFromStorage(key, defaultValue = []) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

// localStorage에 배열 저장
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// 고유 ID 생성
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 오늘 날짜를 YYYY-MM-DD 문자열로 (로컬 기준)
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 날짜 문자열이 미래인지 확인 (로컬 자정 기준)
function isFutureDate(dateString) {
  const today = getTodayString();
  return dateString > today;
}

// ==================== 회원 관리 ====================

let members = loadFromStorage('members', []);
let activities = loadFromStorage('activities', []);

// 회원 추가
function addMember() {
  const nameInput = document.getElementById('memberName');
  const skillInput = document.getElementById('memberSkill');
  const errorDiv = document.getElementById('memberError');

  const name = nameInput.value.trim();
  const skill = skillInput.value;

  errorDiv.textContent = '';

  // 검증: 이름 필수
  if (!name) {
    errorDiv.textContent = '이름은 필수입니다.';
    return;
  }

  // 검증: 중복 확인
  if (members.some(m => m.name === name)) {
    errorDiv.textContent = '이미 등록된 이름입니다.';
    return;
  }

  // 검증: 등급 필수
  if (!skill) {
    errorDiv.textContent = '실력 등급을 선택하세요.';
    return;
  }

  // 회원 추가
  const member = {
    id: generateId(),
    name,
    skillLevel: skill,
    createdAt: Date.now()
  };

  members.push(member);
  saveToStorage('members', members);

  nameInput.value = '';
  skillInput.value = '';

  renderMembers();
  renderParticipantCheckboxes();
  renderMatchingMemberCheckboxes();
  updateStats();
  updateParticipationRanking();

  // 회원이 2명 이상이면 매칭 카드 표시
  if (members.length >= 2) {
    document.getElementById('matchingCard').style.display = 'block';
  }
}

// 회원 목록 렌더링
function renderMembers() {
  const memberList = document.getElementById('memberList');
  memberList.innerHTML = '';

  if (members.length === 0) {
    memberList.innerHTML = '<div class="empty-message">아직 등록된 회원이 없습니다.</div>';
    return;
  }

  members.forEach(member => {
    const skillEmoji = {
      '상': '🔴',
      '중': '🟡',
      '하': '🟢'
    }[member.skillLevel] || '⚪';

    const badge = document.createElement('div');
    badge.className = 'member-badge';
    badge.textContent = `${skillEmoji} ${member.name} (${member.skillLevel})`;
    memberList.appendChild(badge);
  });
}

// 활동 등록 폼의 참여자 체크박스 렌더링
function renderParticipantCheckboxes() {
  const checkboxDiv = document.getElementById('participantCheckboxes');
  checkboxDiv.innerHTML = '';

  if (members.length === 0) {
    checkboxDiv.innerHTML = '<div class="empty-message">먼저 회원을 등록하세요.</div>';
    return;
  }

  members.forEach(member => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = member.id;
    checkbox.dataset.memberId = member.id;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${member.name}`));
    checkboxDiv.appendChild(label);
  });
}

// 매칭 섹션의 회원 체크박스 렌더링
function renderMatchingMemberCheckboxes() {
  const checkboxDiv = document.getElementById('matchingMemberCheckboxes');
  checkboxDiv.innerHTML = '';

  if (members.length === 0) {
    checkboxDiv.innerHTML = '<div class="empty-message">먼저 회원을 등록하세요.</div>';
    return;
  }

  members.forEach(member => {
    const skillEmoji = {
      '상': '🔴',
      '중': '🟡',
      '하': '🟢'
    }[member.skillLevel] || '⚪';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = member.id;
    checkbox.dataset.memberId = member.id;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${skillEmoji} ${member.name} (${member.skillLevel})`));
    checkboxDiv.appendChild(label);
  });
}

// ==================== 활동 관리 ====================

// 활동 등록 (폼 제출)
function handleActivitySubmit(e) {
  e.preventDefault();

  const titleInput = document.getElementById('actTitle');
  const dateInput = document.getElementById('actDate');
  const placeInput = document.getElementById('actPlace');
  const checkboxes = document.querySelectorAll('#participantCheckboxes input[type="checkbox"]:checked');
  const memoInput = document.getElementById('actMemo');

  // 에러 메시지 초기화
  document.getElementById('titleError').textContent = '';
  document.getElementById('dateError').textContent = '';
  document.getElementById('participantError').textContent = '';

  const title = titleInput.value.trim();
  const date = dateInput.value;
  const place = placeInput.value.trim();
  const participantIds = Array.from(checkboxes).map(cb => cb.value);
  const memo = memoInput.value.trim();

  let hasError = false;

  // 검증: 활동명 필수
  if (!title) {
    document.getElementById('titleError').textContent = '활동명은 필수입니다.';
    hasError = true;
  }

  // 검증: 날짜 필수
  if (!date) {
    document.getElementById('dateError').textContent = '날짜는 필수입니다.';
    hasError = true;
  } else if (isFutureDate(date)) {
    document.getElementById('dateError').textContent = '미래 날짜는 선택할 수 없습니다.';
    hasError = true;
  }

  // 검증: 참여자 1명 이상
  if (participantIds.length === 0) {
    document.getElementById('participantError').textContent = '참여자를 1명 이상 선택하세요.';
    hasError = true;
  }

  if (hasError) {
    return;
  }

  // 활동 추가
  const activity = {
    id: generateId(),
    title,
    date,
    place,
    participantIds,
    memo,
    createdAt: Date.now()
  };

  activities.push(activity);
  saveToStorage('activities', activities);

  // 폼 초기화
  document.getElementById('activityForm').reset();
  renderParticipantCheckboxes();

  // 전체 업데이트
  renderActivities();
  updateStats();
  updateParticipationRanking();

  // 회원이 2명 이상이면 매칭 카드 표시
  if (members.length >= 2) {
    document.getElementById('matchingCard').style.display = 'block';
  }
}

// 활동 목록 렌더링 (최신순 정렬, 검색 필터 적용)
function renderActivities() {
  const searchKeyword = document.getElementById('searchKeyword')?.value.toLowerCase().trim() || '';

  // 정렬: date 내림차순 → createdAt 내림차순
  const sorted = [...activities].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date > b.date ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });

  // 필터: 활동명·장소 키워드
  const filtered = searchKeyword
    ? sorted.filter(act =>
        act.title.toLowerCase().includes(searchKeyword) ||
        act.place.toLowerCase().includes(searchKeyword)
      )
    : sorted;

  const activityList = document.getElementById('activityList');
  activityList.innerHTML = '';

  if (filtered.length === 0) {
    activityList.innerHTML = '<div class="empty-message">등록된 활동이 없습니다.</div>';
    return;
  }

  filtered.forEach(activity => {
    const participants = activity.participantIds.map(id => {
      const member = members.find(m => m.id === id);
      return member ? member.name : '(삭제된 회원)';
    }).join(', ');

    const card = document.createElement('div');
    card.className = 'activity-card';

    const title = document.createElement('div');
    title.className = 'activity-title';
    title.textContent = activity.title;

    const info = document.createElement('div');
    info.className = 'activity-info';
    info.innerHTML = `
      <div class="activity-info-item">
        <span class="activity-info-label">날짜:</span>
        <span>${activity.date}</span>
      </div>
      <div class="activity-info-item">
        <span class="activity-info-label">장소:</span>
        <span>${activity.place}</span>
      </div>
    `;

    const participantsDiv = document.createElement('div');
    participantsDiv.className = 'activity-participants';
    participantsDiv.innerHTML = `<strong>참여자:</strong> ${participants}`;

    const memo = document.createElement('div');
    memo.className = 'activity-memo';
    memo.textContent = activity.memo || '(메모 없음)';

    const actions = document.createElement('div');
    actions.className = 'activity-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = '✏️ 수정';
    editBtn.onclick = () => editActivity(activity.id);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = '🗑️ 삭제';
    deleteBtn.onclick = () => deleteActivity(activity.id);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(title);
    card.appendChild(info);
    card.appendChild(participantsDiv);
    card.appendChild(memo);
    card.appendChild(actions);

    activityList.appendChild(card);
  });
}

// 활동 삭제
function deleteActivity(activityId) {
  if (!confirm('정말로 이 활동을 삭제하시겠습니까?')) {
    return;
  }

  activities = activities.filter(a => a.id !== activityId);
  saveToStorage('activities', activities);

  renderActivities();
  updateStats();
  updateParticipationRanking();
}

// 활동 수정 (인라인 편집)
function editActivity(activityId) {
  const activity = activities.find(a => a.id === activityId);
  if (!activity) return;

  // 입력 폼 채우기
  document.getElementById('actTitle').value = activity.title;
  document.getElementById('actDate').value = activity.date;
  document.getElementById('actPlace').value = activity.place;
  document.getElementById('actMemo').value = activity.memo;

  // 참여자 체크박스 상태 복원
  setTimeout(() => {
    const checkboxes = document.querySelectorAll('#participantCheckboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = activity.participantIds.includes(cb.value);
    });
  }, 0);

  // 삭제 후 폼 제출로 업데이트
  activities = activities.filter(a => a.id !== activityId);

  // 스크롤
  document.getElementById('actTitle').focus();
  document.getElementById('actTitle').scrollIntoView({ behavior: 'smooth' });
}

// ==================== 통계 & 랭킹 ====================

// 통계 업데이트
function updateStats() {
  const count = activities.length;
  const totalParticipants = activities.reduce((sum, act) => sum + act.participantIds.length, 0);
  const avgParticipants = count === 0 ? '—' : (totalParticipants / count).toFixed(1);

  document.getElementById('statActivityCount').textContent = count;
  document.getElementById('statTotalParticipants').textContent = totalParticipants;
  document.getElementById('statAvgParticipants').textContent = avgParticipants;
}

// 회원별 참여 횟수 랭킹
function updateParticipationRanking() {
  const ranking = members.map(member => {
    const count = activities.filter(act => act.participantIds.includes(member.id)).length;
    return { member, count };
  }).sort((a, b) => b.count - a.count);

  const rankingDiv = document.getElementById('participationRanking');
  rankingDiv.innerHTML = '';

  if (ranking.length === 0) {
    rankingDiv.innerHTML = '<div class="empty-message">회원을 등록하세요.</div>';
    return;
  }

  ranking.forEach((item, index) => {
    const rankItem = document.createElement('div');
    rankItem.className = 'ranking-item';

    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = `${index + 1}. `;

    const name = document.createElement('span');
    name.textContent = item.member.name;

    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `${item.count}회`;

    rankItem.appendChild(rank);
    rankItem.appendChild(name);
    rankItem.appendChild(count);
    rankingDiv.appendChild(rankItem);
  });
}

// ==================== 검색 ====================

function setupSearch() {
  const searchInput = document.getElementById('searchKeyword');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderActivities();
    });
  }
}

// ==================== 샘플 데이터 ====================

function loadSampleData() {
  if (members.length > 0 || activities.length > 0) {
    if (!confirm('기존 데이터가 있습니다. 샘플 데이터로 덮어씌우시겠습니까?')) {
      return;
    }
  }

  // 샘플 회원 6명
  const sampleMembers = [
    { id: 'm1', name: '김영우', skillLevel: '상', createdAt: Date.now() - 100000 },
    { id: 'm2', name: '이민준', skillLevel: '상', createdAt: Date.now() - 90000 },
    { id: 'm3', name: '박지훈', skillLevel: '중', createdAt: Date.now() - 80000 },
    { id: 'm4', name: '최하진', skillLevel: '중', createdAt: Date.now() - 70000 },
    { id: 'm5', name: '신희주', skillLevel: '하', createdAt: Date.now() - 60000 },
    { id: 'm6', name: '조민수', skillLevel: '하', createdAt: Date.now() - 50000 }
  ];

  // 샘플 활동 5건
  const today = getTodayString();
  const sampleActivities = [
    {
      id: 'a1',
      title: '정기 랠리 모임',
      date: today,
      place: '서울 강남 배드민턴장',
      participantIds: ['m1', 'm3', 'm5'],
      memo: '복식 위주, 신입 1명 참여',
      createdAt: Date.now() - 40000
    },
    {
      id: 'a2',
      title: '신입 환영 전시회',
      date: today,
      place: '서울 강남 배드민턴장',
      participantIds: ['m1', 'm2', 'm3', 'm4'],
      memo: '신입 2명과 함께 기초 레슨',
      createdAt: Date.now() - 30000
    },
    {
      id: 'a3',
      title: '번개 모임',
      date: today,
      place: '서울 강남 배드민턴장',
      participantIds: ['m2', 'm4', 'm6'],
      memo: '',
      createdAt: Date.now() - 20000
    },
    {
      id: 'a4',
      title: '내부 대회',
      date: today,
      place: '서울 강동 배드민턴장',
      participantIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
      memo: '단식 3경기, 복식 2경기 진행',
      createdAt: Date.now() - 10000
    },
    {
      id: 'a5',
      title: '야외 활동',
      date: today,
      place: '한강공원',
      participantIds: ['m3', 'm5'],
      memo: '가볍게 즐기는 모임',
      createdAt: Date.now()
    }
  ];

  members = sampleMembers;
  activities = sampleActivities;

  saveToStorage('members', members);
  saveToStorage('activities', activities);

  renderMembers();
  renderParticipantCheckboxes();
  renderMatchingMemberCheckboxes();
  renderActivities();
  updateStats();
  updateParticipationRanking();

  // 매칭 카드 표시
  document.getElementById('matchingCard').style.display = 'block';

  alert('샘플 데이터가 로드되었습니다!');
}

// ==================== 자체검증 ====================

function runSelfCheck() {
  console.log('=== 자체검증 시작 ===');
  let passed = 0;
  let failed = 0;

  // 테스트 1: 오늘 날짜는 미래가 아니어야 함
  const today = getTodayString();
  const isNotFuture = !isFutureDate(today);
  console.assert(isNotFuture, '✗ 오늘 날짜가 미래로 판정됨');
  if (isNotFuture) {
    console.log('✓ 테스트 1 통과: 오늘 날짜 정상 (미래 아님)');
    passed++;
  } else {
    failed++;
  }

  // 테스트 2: 어제 날짜는 미래가 아니어야 함
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yestString = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
  const isYestNotFuture = !isFutureDate(yestString);
  console.assert(isYestNotFuture, '✗ 어제 날짜가 미래로 판정됨');
  if (isYestNotFuture) {
    console.log('✓ 테스트 2 통과: 어제 날짜 정상 (미래 아님)');
    passed++;
  } else {
    failed++;
  }

  // 테스트 3: 내일 날짜는 미래여야 함
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomString = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
  const isTomFuture = isFutureDate(tomString);
  console.assert(isTomFuture, '✗ 내일 날짜가 미래로 판정되지 않음');
  if (isTomFuture) {
    console.log('✓ 테스트 3 통과: 내일 날짜 정상 (미래)');
    passed++;
  } else {
    failed++;
  }

  // 테스트 4: 활동 0건일 때 통계에 NaN 없어야 함
  const tempActivities = activities;
  activities = [];
  updateStats();
  const avgText = document.getElementById('statAvgParticipants').textContent;
  const noNaN = avgText !== 'NaN' && avgText !== '—';
  console.assert(noNaN || avgText === '—', '✗ 활동 0건일 때 평균이 NaN 노출됨');
  if (noNaN || avgText === '—') {
    console.log(`✓ 테스트 4 통과: 평균 표시 정상 (${avgText})`);
    passed++;
  } else {
    failed++;
  }
  activities = tempActivities;
  updateStats();

  // 테스트 5: 샘플 데이터 로드 시 회원별 참여 횟수 정확성
  loadSampleData();
  const expectedRanking = {
    'm1': 3, // a1, a4, a4 실제로는 a1, a2, a4 = 3회
    'm2': 3, // a2, a3, a4
    'm3': 4, // a1, a2, a4, a5
    'm4': 3, // a2, a3, a4
    'm5': 3, // a1, a4, a5
    'm6': 2  // a4, a3
  };

  let rankingPass = true;
  for (const [memberId, expectedCount] of Object.entries(expectedRanking)) {
    const actualCount = activities.filter(a => a.participantIds.includes(memberId)).length;
    if (actualCount !== expectedCount) {
      console.warn(`✗ 회원 ${memberId}: 예상 ${expectedCount}회, 실제 ${actualCount}회`);
      rankingPass = false;
    }
  }

  console.assert(rankingPass, '✗ 참여 횟수 계산 오류');
  if (rankingPass) {
    console.log('✓ 테스트 5 통과: 회원별 참여 횟수 정확성 확인');
    passed++;
  } else {
    failed++;
  }

  // 테스트 6: 총 참여 연인원 정확성
  const totalParticipants = activities.reduce((sum, act) => sum + act.participantIds.length, 0);
  const displayedTotal = parseInt(document.getElementById('statTotalParticipants').textContent);
  const totalPass = totalParticipants === displayedTotal;
  console.assert(totalPass, `✗ 총 참여 연인원: 예상 ${totalParticipants}, 실제 ${displayedTotal}`);
  if (totalPass) {
    console.log(`✓ 테스트 6 통과: 총 참여 연인원 ${totalParticipants}명 정확`);
    passed++;
  } else {
    failed++;
  }

  // 테스트 7: 평균 계산 정확성
  const count = activities.length;
  const expectedAvg = (totalParticipants / count).toFixed(1);
  const displayedAvg = document.getElementById('statAvgParticipants').textContent;
  const avgPass = displayedAvg === expectedAvg;
  console.assert(avgPass, `✗ 평균 참여 인원: 예상 ${expectedAvg}, 실제 ${displayedAvg}`);
  if (avgPass) {
    console.log(`✓ 테스트 7 통과: 평균 참여 인원 ${expectedAvg}명 정확`);
    passed++;
  } else {
    failed++;
  }

  console.log(`\n=== 자체검증 완료 ===`);
  console.log(`✓ 통과: ${passed}개`);
  console.log(`✗ 실패: ${failed}개`);
  console.log(`결과: ${failed === 0 ? '모든 테스트 통과 ✓' : `${failed}개 실패 ✗`}`);

  return failed === 0;
}

// ==================== 매칭 ====================

// 1vs1 매칭
function match1vs1() {
  if (members.length < 2) {
    alert('1vs1 매칭을 위해 회원이 2명 이상 필요합니다.');
    return;
  }

  const shuffled = [...members].sort(() => Math.random() - 0.5);
  const team1 = shuffled[0];
  const team2 = shuffled[1];

  displayMatchResult(`
    <div class="matching-team">
      <div class="team-box">
        <div class="team-title">${team1.name}</div>
        <div class="team-member">${team1.skillLevel}</div>
      </div>
      <div class="vs-text">VS</div>
      <div class="team-box">
        <div class="team-title">${team2.name}</div>
        <div class="team-member">${team2.skillLevel}</div>
      </div>
    </div>
  `);
}

// 2vs2 매칭 (실력 균형 고려)
function match2vs2() {
  if (members.length < 4) {
    alert('2vs2 매칭을 위해 회원이 4명 이상 필요합니다.');
    return;
  }

  const skillScore = { '상': 3, '중': 2, '하': 1 };
  let bestCombination = null;
  let bestDiff = Infinity;

  // 최대 200회 반복해서 최적의 조합 찾기
  for (let i = 0; i < 200; i++) {
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const four = shuffled.slice(0, 4);

    const team1 = [four[0], four[3]];
    const team2 = [four[1], four[2]];

    const team1Score = team1.reduce((sum, m) => sum + skillScore[m.skillLevel], 0);
    const team2Score = team2.reduce((sum, m) => sum + skillScore[m.skillLevel], 0);
    const diff = Math.abs(team1Score - team2Score);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombination = { team1, team2, team1Score, team2Score };
      if (diff === 0) break; // 완벽한 조합 찾으면 즉시 종료
    }
  }

  const { team1, team2, team1Score, team2Score } = bestCombination;

  displayMatchResult(`
    <div class="matching-team">
      <div class="team-box">
        <div class="team-title">팀 1</div>
        ${team1.map(m => `<div class="team-member">${m.name} (${m.skillLevel})</div>`).join('')}
        <div class="team-score">점수: ${team1Score}</div>
      </div>
      <div class="vs-text">VS</div>
      <div class="team-box">
        <div class="team-title">팀 2</div>
        ${team2.map(m => `<div class="team-member">${m.name} (${m.skillLevel})</div>`).join('')}
        <div class="team-score">점수: ${team2Score}</div>
      </div>
    </div>
  `);
}

// 매칭 결과 표시
function displayMatchResult(html) {
  const resultDiv = document.getElementById('matchingResult');
  resultDiv.innerHTML = html;
}

// 선택된 회원으로 매칭 실행
function executeMatching() {
  const checkboxes = document.querySelectorAll('#matchingMemberCheckboxes input[type="checkbox"]:checked');
  const selectedMemberIds = Array.from(checkboxes).map(cb => cb.value);
  const selectedMembers = selectedMemberIds
    .map(id => members.find(m => m.id === id))
    .filter(m => m);

  if (selectedMembers.length < 2) {
    alert('매칭을 위해 회원을 2명 이상 선택하세요.');
    return;
  }

  const count = selectedMembers.length;

  if (count === 2) {
    // 1vs1 매칭
    matchSelectedWith1vs1(selectedMembers);
  } else if (count === 4) {
    // 2vs2 매칭
    matchSelectedWith2vs2(selectedMembers);
  } else if (count === 6) {
    // 3vs3 매칭
    matchSelectedWith3vs3(selectedMembers);
  } else {
    alert(`현재는 2명, 4명, 6명 선택만 지원합니다. (선택된 인원: ${count}명)`);
  }
}

// 선택된 회원으로 1vs1 매칭
function matchSelectedWith1vs1(selectedMembers) {
  if (selectedMembers.length < 2) {
    alert('1vs1 매칭을 위해 회원이 2명 이상 필요합니다.');
    return;
  }

  const shuffled = [...selectedMembers].sort(() => Math.random() - 0.5);
  const team1 = shuffled[0];
  const team2 = shuffled[1];

  const skillEmoji = { '상': '🔴', '중': '🟡', '하': '🟢' };

  displayMatchResult(`
    <div style="text-align: center; margin: 20px 0;">
      <div style="display: flex; justify-content: space-around; align-items: center; gap: 20px; margin: 20px 0;">
        <div style="flex: 1; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #1a1a1a;">${team1.name}</div>
          <div style="font-size: 16px; color: #666; margin-top: 5px;">${skillEmoji[team1.skillLevel]} ${team1.skillLevel}</div>
        </div>
        <div style="font-size: 28px; font-weight: 700; color: #2f7d3c;">VS</div>
        <div style="flex: 1; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #1a1a1a;">${team2.name}</div>
          <div style="font-size: 16px; color: #666; margin-top: 5px;">${skillEmoji[team2.skillLevel]} ${team2.skillLevel}</div>
        </div>
      </div>
    </div>
  `);
}

// 선택된 회원으로 2vs2 매칭
function matchSelectedWith2vs2(selectedMembers) {
  if (selectedMembers.length < 4) {
    alert('2vs2 매칭을 위해 회원이 4명 이상 필요합니다.');
    return;
  }

  const skillScore = { '상': 3, '중': 2, '하': 1 };
  let bestCombination = null;
  let bestDiff = Infinity;

  // 최대 200회 반복해서 최적의 조합 찾기
  for (let i = 0; i < 200; i++) {
    const shuffled = [...selectedMembers].sort(() => Math.random() - 0.5);
    const four = shuffled.slice(0, 4);

    const team1 = [four[0], four[3]];
    const team2 = [four[1], four[2]];

    const team1Score = team1.reduce((sum, m) => sum + skillScore[m.skillLevel], 0);
    const team2Score = team2.reduce((sum, m) => sum + skillScore[m.skillLevel], 0);
    const diff = Math.abs(team1Score - team2Score);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombination = { team1, team2, team1Score, team2Score };
      if (diff === 0) break;
    }
  }

  const { team1, team2, team1Score, team2Score } = bestCombination;
  const skillEmoji = { '상': '🔴', '중': '🟡', '하': '🟢' };

  displayMatchResult(`
    <div class="matching-team">
      <div class="team-box">
        <div class="team-title">팀 1</div>
        ${team1.map(m => `<div class="team-member">${skillEmoji[m.skillLevel]} ${m.name} (${m.skillLevel})</div>`).join('')}
        <div class="team-score">점수: ${team1Score}</div>
      </div>
      <div class="vs-text">VS</div>
      <div class="team-box">
        <div class="team-title">팀 2</div>
        ${team2.map(m => `<div class="team-member">${skillEmoji[m.skillLevel]} ${m.name} (${m.skillLevel})</div>`).join('')}
        <div class="team-score">점수: ${team2Score}</div>
      </div>
    </div>
  `);
}

// 선택된 회원으로 3vs3 매칭
function matchSelectedWith3vs3(selectedMembers) {
  if (selectedMembers.length < 6) {
    alert('3vs3 매칭을 위해 회원이 6명 이상 필요합니다.');
    return;
  }

  const skillScore = { '상': 3, '중': 2, '하': 1 };
  let bestCombination = null;
  let bestDiff = Infinity;

  // 최대 200회 반복해서 최적의 조합 찾기
  for (let i = 0; i < 200; i++) {
    const shuffled = [...selectedMembers].sort(() => Math.random() - 0.5);
    const six = shuffled.slice(0, 6);

    const team1 = [six[0], six[3], six[4]];
    const team2 = [six[1], six[2], six[5]];

    const team1Score = team1.reduce((sum, m) => sum + skillScore[m.skillLevel], 0);
    const team2Score = team2.reduce((sum, m) => sum + skillScore[m.skillLevel], 0);
    const diff = Math.abs(team1Score - team2Score);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombination = { team1, team2, team1Score, team2Score };
      if (diff === 0) break;
    }
  }

  const { team1, team2, team1Score, team2Score } = bestCombination;
  const skillEmoji = { '상': '🔴', '중': '🟡', '하': '🟢' };

  displayMatchResult(`
    <div class="matching-team">
      <div class="team-box">
        <div class="team-title">팀 1</div>
        ${team1.map(m => `<div class="team-member">${skillEmoji[m.skillLevel]} ${m.name} (${m.skillLevel})</div>`).join('')}
        <div class="team-score">점수: ${team1Score}</div>
      </div>
      <div class="vs-text">VS</div>
      <div class="team-box">
        <div class="team-title">팀 2</div>
        ${team2.map(m => `<div class="team-member">${skillEmoji[m.skillLevel]} ${m.name} (${m.skillLevel})</div>`).join('')}
        <div class="team-score">점수: ${team2Score}</div>
      </div>
    </div>
  `);
}

// ==================== 데이터 관리 ====================

// 데이터 내보내기 (JSON 다운로드)
function exportData() {
  const data = {
    members: loadFromStorage('members', []),
    activities: loadFromStorage('activities', []),
    matchHistory: loadFromStorage('matchHistory', []),
    exportDate: new Date().toISOString()
  };

  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const today = getTodayString();
  link.download = `badminton_data_${today.replace(/-/g, '')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showDataMessage('✅ 데이터가 내보내졌습니다!', false);
}

// 파일 선택 후 처리
function handleFileImport(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      // 데이터 검증
      if (!data.members || !data.activities) {
        throw new Error('잘못된 파일 형식입니다.');
      }

      // 회원 데이터 병합 (ID 기준)
      let existingMembers = loadFromStorage('members', []);
      const memberMap = new Map(existingMembers.map(m => [m.id, m]));
      data.members.forEach(m => memberMap.set(m.id, m));
      const mergedMembers = Array.from(memberMap.values());

      // 활동 데이터 병합 (ID 기준)
      let existingActivities = loadFromStorage('activities', []);
      const activityMap = new Map(existingActivities.map(a => [a.id, a]));
      data.activities.forEach(a => activityMap.set(a.id, a));
      const mergedActivities = Array.from(activityMap.values());

      // 매칭 히스토리 병합
      let existingHistory = loadFromStorage('matchHistory', []);
      const historyMap = new Map(existingHistory.map(h => [h.id, h]));
      if (data.matchHistory) {
        data.matchHistory.forEach(h => historyMap.set(h.id, h));
      }
      const mergedHistory = Array.from(historyMap.values());

      // 저장
      saveToStorage('members', mergedMembers);
      saveToStorage('activities', mergedActivities);
      saveToStorage('matchHistory', mergedHistory);

      // 전역 변수 업데이트
      members = mergedMembers;
      activities = mergedActivities;

      // UI 갱신
      renderMembers();
      renderParticipantCheckboxes();
      renderMatchingMemberCheckboxes();
      renderActivities();
      updateStats();
      updateParticipationRanking();

      showDataMessage(`✅ 데이터가 가져와졌습니다! (회원: ${mergedMembers.length}명, 활동: ${mergedActivities.length}건)`, false);
    } catch (error) {
      showDataMessage(`❌ 오류: ${error.message}`, true);
    }
  };

  reader.readAsText(file);
}

// 데이터 메시지 표시
function showDataMessage(message, isError) {
  const msgDiv = document.getElementById('dataMessage');
  msgDiv.textContent = message;
  msgDiv.style.color = isError ? '#d32f2f' : '#388e3c';
  setTimeout(() => {
    msgDiv.textContent = '';
  }, 4000);
}

// ==================== 초기화 ====================

document.addEventListener('DOMContentLoaded', () => {
  renderMembers();
  renderParticipantCheckboxes();
  renderMatchingMemberCheckboxes();
  renderActivities();
  updateStats();
  updateParticipationRanking();
  setupSearch();

  document.getElementById('addMemberBtn').addEventListener('click', addMember);
  document.getElementById('activityForm').addEventListener('submit', handleActivitySubmit);
  document.getElementById('sampleDataBtn').addEventListener('click', loadSampleData);
  document.getElementById('matchingExecuteBtn').addEventListener('click', executeMatching);
  document.getElementById('exportDataBtn').addEventListener('click', exportData);
  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFileImport(e.target.files[0]);
      e.target.value = ''; // 파일 입력 초기화
    }
  });

  // 회원이 2명 이상이면 매칭 영역 표시
  if (members.length >= 2) {
    document.getElementById('matchingCard').style.display = 'block';
  }

  // 엔터 키로 회원 추가
  document.getElementById('memberName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addMember();
  });
});
