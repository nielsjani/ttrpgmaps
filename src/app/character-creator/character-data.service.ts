import { Injectable } from '@angular/core';
import {StartData} from "./data/start-data";

@Injectable({
  providedIn: 'root'
})
export class CharacterDataService {

  constructor() { }

  updateStartData(value: StartData) {
    console.log(value)
  }

  updateClassChoice(classChoice: any) {
    console.log(classChoice);
  }
}
