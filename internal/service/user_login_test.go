//
//  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

package service

import (
	"testing"

	"ragflow/internal/common"
	"ragflow/internal/dao"
	"ragflow/internal/entity"
	"ragflow/internal/server"
)

// TestLoginOrRegisterByEmailCreatesAccountOnFirstLogin covers the login flow
// that registers an unknown email: the first login creates the user, tenant,
// owner membership and root folder, and the next login reuses that account.
func TestLoginOrRegisterByEmailCreatesAccountOnFirstLogin(t *testing.T) {
	if err := server.Init(""); err != nil {
		t.Fatalf("server.Init: %v", err)
	}
	pushServiceDB(t, setupServiceTestDB(t))

	svc := NewUserService()
	// Not valid base64, so DecryptPassword treats it as plain text.
	password := "not-base64-password!"
	email := "new-user@example.com"
	req := &EmailLoginRequest{Email: email, Password: password}

	user, created, code, err := svc.LoginOrRegisterByEmail(t.Context(), req)
	if err != nil {
		t.Fatalf("first login failed: %v", err)
	}
	if code != common.CodeSuccess {
		t.Fatalf("first login code = %v, want %v", code, common.CodeSuccess)
	}
	if !created {
		t.Fatal("first login did not report a new account")
	}
	if user.Nickname != email {
		t.Fatalf("nickname = %q, want email %q", user.Nickname, email)
	}
	if user.AccessToken == nil || *user.AccessToken == "" {
		t.Fatal("new user has no access token")
	}
	if user.Password == nil || *user.Password == password {
		t.Fatal("new user password was not hashed")
	}

	var tenant entity.Tenant
	if err := dao.DB.Where("id = ?", user.ID).First(&tenant).Error; err != nil {
		t.Fatalf("tenant not created: %v", err)
	}
	if tenant.Name == nil || *tenant.Name != email+"'s Kingdom" {
		t.Fatalf("tenant name = %v, want %q", tenant.Name, email+"'s Kingdom")
	}

	var membership entity.UserTenant
	if err := dao.DB.Where("user_id = ? AND tenant_id = ?", user.ID, user.ID).First(&membership).Error; err != nil {
		t.Fatalf("user tenant relation not created: %v", err)
	}
	if membership.Role != "owner" {
		t.Fatalf("membership role = %q, want owner", membership.Role)
	}

	var rootFolder entity.File
	if err := dao.DB.Where("tenant_id = ? AND type = ?", user.ID, "folder").First(&rootFolder).Error; err != nil {
		t.Fatalf("root folder not created: %v", err)
	}
	if rootFolder.Name != "/" || rootFolder.ParentID != rootFolder.ID {
		t.Fatalf("root folder = %+v, want self-parented /", rootFolder)
	}

	again, createdAgain, code, err := svc.LoginOrRegisterByEmail(t.Context(), req)
	if err != nil {
		t.Fatalf("second login failed: %v", err)
	}
	if code != common.CodeSuccess || createdAgain {
		t.Fatalf("second login = (created=%v, code=%v), want (false, %v)", createdAgain, code, common.CodeSuccess)
	}
	if again.ID != user.ID {
		t.Fatalf("second login user = %q, want %q", again.ID, user.ID)
	}

	badReq := &EmailLoginRequest{Email: email, Password: "wrong-not-base64-password!"}
	if _, _, code, err = svc.LoginOrRegisterByEmail(t.Context(), badReq); err == nil || code != common.CodeAuthenticationError {
		t.Fatalf("wrong password = (code=%v, err=%v), want %v", code, err, common.CodeAuthenticationError)
	}
}
