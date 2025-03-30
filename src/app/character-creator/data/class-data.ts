export class ClassData {

  static classes = [
    { id: 'BARBARIAN', name: 'Barbarian', description: 'A fierce warrior fueled by rage, excelling in raw strength and resilience.' },
    { id: 'FIGHTER', name: 'Fighter', description: 'A master of weapons and tactics, adaptable in any combat situation.' },
    { id: 'MONK', name: 'Monk', description: 'A disciplined martial artist who harnesses ki to perform supernatural feats.' },
    { id: 'ROGUE', name: 'Rogue', description: 'A stealthy and cunning expert in deception, thievery, and precision strikes.' },
    { id: 'CLERIC', name: 'Cleric', description: 'A divine spellcaster serving a deity, capable of healing and smiting foes.' },
    { id: 'DRUID', name: 'Druid', description: 'A nature-based spellcaster who can shapeshift into animals and wield primal magic.' },
    { id: 'SORCERER', name: 'Sorcerer', description: 'A magic user with innate arcane power, casting spells through sheer will.' },
    { id: 'WIZARD', name: 'Wizard', description: 'A scholarly spellcaster who learns and prepares spells from ancient tomes.' },
    { id: 'WARLOCK', name: 'Warlock', description: 'A spellcaster who gains magic from a pact with a powerful otherworldly entity.' },
    { id: 'BARD', name: 'Bard', description: 'A charismatic performer who uses magic, music, and inspiration to support allies.' },
    { id: 'PALADIN', name: 'Paladin', description: 'A holy warrior sworn to an oath, combining divine magic with martial prowess.' },
    { id: 'RANGER', name: 'Ranger', description: 'A skilled hunter and tracker who blends combat skills with nature magic.' },
    { id: 'ARTIFICER', name: 'Artificer', description: 'A magical inventor who creates enchanted items and constructs.' }
  ];

  static hasFirstLevelChoice(clazzId: string) {
    return clazzId === 'CLERIC' || clazzId === 'SORCERER' || clazzId === 'WARLOCK';
  }
}
